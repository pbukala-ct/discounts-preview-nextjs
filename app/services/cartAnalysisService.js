// services/cartAnalysisService.js
import { cartDiscounts } from './cartDiscounts';
import { categoryService } from './categoryService';

class CartAnalysisService {
  constructor() {
    this.cache = {
      autoDiscounts: null,
      lastFetchTime: null,
      expiryTime: 5 * 60 * 1000
    };
  }

  async getAutoDiscounts() {
    const now = Date.now();
    if (this.cache.autoDiscounts && 
        this.cache.lastFetchTime && 
        (now - this.cache.lastFetchTime < this.cache.expiryTime)) {
      return this.cache.autoDiscounts;
    }

    const result = await cartDiscounts.getAutoTriggeredDiscounts();
    this.cache.autoDiscounts = result;
    this.cache.lastFetchTime = now;
    return result;
  }

  async analyzeCart(cartData) {
    const [categoryData, autoDiscountsData] = await Promise.all([
      categoryService.getCartProductCategories(cartData),
      this.getAutoDiscounts()
    ]);

    // Extract all category IDs from discount predicates that might need category info
  const categoryIds = new Set();
  for (const discount of autoDiscountsData.promotions) {
    if (discount.cartPredicate) {
      // Look for category IDs in the predicate
      const categoryMatches = discount.cartPredicate.match(/categories\.id contains any \("([^"]+)"\)/g);
      if (categoryMatches) {
        for (const match of categoryMatches) {
          const idMatch = match.match(/"([^"]+)"/);
          if (idMatch && idMatch[1]) {
            categoryIds.add(idMatch[1]);
          }
        }
      }
    }
  }

  // Fetch any missing category information
  const missingCategoryIds = Array.from(categoryIds).filter(
    id => !categoryData.categories.some(cat => cat.id === id)
  );

  if (missingCategoryIds.length > 0) {
    const additionalCategories = await Promise.all(
      missingCategoryIds.map(id => categoryService.getCategoryById(id))
    );
    
    // Add the fetched categories to our category data
    for (const category of additionalCategories) {
      if (category) {
        categoryData.categories.push({
          id: category.id,
          name: category.name,
          quantity: 0, // No items in cart from this category
          totalPrice: 0 // No price contribution from this category
        });
      }
    }
  }

    const discountAnalysis = this.analyzeDiscounts(
      autoDiscountsData.promotions,
      categoryData,
      cartData
    );

    return {
      categories: categoryData.categories,
      totalProducts: categoryData.totalProducts,
      autoDiscounts: autoDiscountsData.promotions,
      discountAnalysis,
      error: autoDiscountsData.error
    };
  }

  /**
   * Analyzes discounts and their predicates
   * @private
   */
  analyzeDiscounts(discounts, categoryData, cartData) {
    return discounts.map(discount => {
      if (!discount.isActive) {
        return {
          discount,
          isApplicable: false,
          reason: 'Discount is not active'
        };
      }

      const predicate = discount.cartPredicate;
      const analysis = this.analyzeCartPredicate(predicate, categoryData, cartData);

      return {
        discount,
        ...analysis
      };
    });
  }

  /**
   * Analyzes a cart predicate and returns qualification information
   * @private
   */
  
  analyzeCartPredicate(predicate, categoryData, cartData) {
    // Clean the predicate string
    predicate = predicate.trim();
  
    // console.log('Analyzing predicate:', predicate);
    // console.log('Category Data:', categoryData);
    // console.log('Cart Data:', cartData);
  
    // Check for combined conditions FIRST
    if (predicate.includes(' and ')) {
      const conditions = predicate.split(' and ');
      // Analyze each condition separately
      const analyses = conditions.map(condition => 
        this.analyzeCartPredicate(condition.trim(), categoryData, cartData)
      );
  
      // All conditions must be applicable for the discount to be applicable
      const isApplicable = analyses.every(a => a.isApplicable);
      
      // Separate qualified and pending conditions
      const qualifiedConditions = analyses
        .filter(a => a.isApplicable)
        .map(a => {
          // Create a message for each qualified condition
          let message = '';
          if (a.type === 'CATEGORY_GROSS_TOTAL') {
            message = `Spent ${a.currentAmount.toFixed(2)} on ${a.categoryName || a.categoryNames} products (required: ${a.requiredAmount.toFixed(2)})`;
          } else if (a.type === 'CATEGORY_COUNT') {
            message = `Added ${a.currentCount || 0} items from ${a.categoryName} (required: ${a.requiredCount || 0})`;
          } else if (a.type === 'SKU_COUNT') {
            message = `Added ${a.currentCount || 0} units of ${a.productName} (required: ${a.requiredCount || 0})`;
          } else if (a.type === 'TOTAL_PRICE') {
            message = `Cart total meets the minimum amount requirement`;
          } else if (a.type === 'CATEGORY_EXISTS') {
            message = `Added items from ${a.categoryName} category`;
          } else if (a.type === 'PRODUCT_EXISTS') {
            message = `Added ${a.productName} to cart`;
          } else {
            message = `Qualified condition`;
          }
          return message;
        });
  
      // Get pending conditions messages
      const pendingConditions = analyses
        .filter(a => !a.isApplicable)
        .map(a => a.qualificationMessage)
        .filter(msg => msg);
  
      // For combined conditions, we need to check if any condition is NOT_APPLICABLE
      const hasNotApplicable = analyses.some(a => a.qualificationStatus === 'NOT_APPLICABLE');
      
      return {
        isApplicable,
        type: 'COMBINED',
        qualificationStatus: hasNotApplicable ? 'NOT_APPLICABLE' : 
                           isApplicable ? 'QUALIFIED' : 'PENDING',
        qualifiedConditions: qualifiedConditions,
        pendingConditions: pendingConditions,
        qualificationMessage: pendingConditions.length > 0 
          ? `Requirements needed: ${pendingConditions.join(' and ')}` 
          : null,
        conditions: analyses
      };
    }
  
    // Early return if this is a customer group condition
    if (predicate.includes('customer.customerGroup.key')) {
      return {
        isApplicable: false,
        type: 'CUSTOMER_GROUP',
        qualificationStatus: 'NOT_APPLICABLE',
        qualificationMessage: 'Customer group specific discount'
      };
    }
  
    // Now check for individual patterns

  // Parse total price condition
  const totalPriceMatch = predicate.match(/totalPrice\s*(>=|>)\s*"(\d+(?:\.\d+)?)\s+([A-Za-z]+)"/);
  if (totalPriceMatch && !predicate.includes(' and ')) {
    const requiredAmount = parseInt(totalPriceMatch[2]) * 100; // Convert to cents
    const currency = totalPriceMatch[3];
    const currentAmount = cartData.totalPrice.centAmount;

    if (currentAmount >= requiredAmount) {
      return {
        isApplicable: true,
        type: 'TOTAL_PRICE',
        qualificationStatus: 'QUALIFIED'
      };
    } else {
      const remaining = (requiredAmount - currentAmount) / 100; // Convert back to main currency unit
      return {
        isApplicable: false,
        type: 'TOTAL_PRICE',
        qualificationStatus: 'PENDING',
        qualificationMessage: `Spend ${currency} ${remaining.toFixed(2)} more to qualify`,
        remainingAmount: remaining
      };
    }
  }


  // Parse category line item count condition (with "contains" instead of "contains any")
const categoryCountSimpleMatch = predicate.match(/lineItemCount\(categories\.id contains \"([^\"]+)\"\)\s*>=\s*(\d+)/);
if (categoryCountSimpleMatch) {
  const categoryId = categoryCountSimpleMatch[1];
  const requiredCount = parseInt(categoryCountSimpleMatch[2]);
  
  const category = categoryData.categories.find(cat => cat.id === categoryId);
  if (!category) {
    return {
      isApplicable: false,
      type: 'CATEGORY_COUNT',
      qualificationStatus: 'NOT_APPLICABLE',
      qualificationMessage: 'Category not found in cart',
      categoryId: categoryId
    };
  }

  const currentCount = category.quantity;
  if (currentCount >= requiredCount) {
    return {
      isApplicable: true,
      type: 'CATEGORY_COUNT',
      qualificationStatus: 'QUALIFIED',
      categoryName: category.name,
      currentCount: currentCount,
      requiredCount: requiredCount
    };
  } else {
    const remaining = requiredCount - currentCount;
    return {
      isApplicable: false,
      type: 'CATEGORY_COUNT',
      qualificationStatus: 'PENDING',
      qualificationMessage: `Add ${remaining} more ${remaining === 1 ? 'item' : 'items'} from ${category.name} to qualify`,
      categoryName: category.name,
      remainingCount: remaining,
      currentCount: currentCount,
      requiredCount: requiredCount
    };
  }
}


// NEW PREDICATE: Parse category gross total condition
// Update the regex pattern to handle multiple category IDs
const categoryGrossTotalMatch = predicate.match(/lineItemGrossTotal\(categories\.id contains any \(([^)]+)\)\)\s*(>=|>)\s*"(\d+(?:\.\d+)?)\s+([A-Za-z]+)"/);
if (categoryGrossTotalMatch) {
  // Extract all category IDs from the match
  const categoryIdsString = categoryGrossTotalMatch[1];
  const categoryIds = categoryIdsString.match(/"([^"]+)"/g).map(id => id.replace(/"/g, ''));
  const operator = categoryGrossTotalMatch[2];
  const requiredAmount = parseFloat(categoryGrossTotalMatch[3]) * 100; // Convert to cents
  const currency = categoryGrossTotalMatch[4];
  
  // Find all matching categories in categoryData
  const matchingCategories = categoryData.categories.filter(cat => categoryIds.includes(cat.id));
  
  if (matchingCategories.length === 0) {
    return {
      isApplicable: false,
      type: 'CATEGORY_GROSS_TOTAL',
      qualificationStatus: 'NOT_APPLICABLE',
      qualificationMessage: 'None of the specified categories found in cart',
      categoryIds: categoryIds
    };
  }

  // Get the total price across all matching categories
  const currentGrossTotal = matchingCategories.reduce((total, cat) => total + (cat.totalPrice || 0), 0);
  
  // Get category names for display
  const categoryNames = matchingCategories.map(cat => cat.name).join(' or ');
  const displayCategoryNames = categoryNames || 'specified categories';
  

  if (currentGrossTotal >= requiredAmount) {
    return {
      isApplicable: true,
      type: 'CATEGORY_GROSS_TOTAL',
      qualificationStatus: 'QUALIFIED',
      categoryNames: displayCategoryNames,
      categoryIds: categoryIds,
      currentAmount: currentGrossTotal / 100, // Convert to main currency unit for display
      requiredAmount: requiredAmount / 100
    };
  } else {
    const remaining = (requiredAmount - currentGrossTotal) / 100; // Convert back to main currency unit
    return {
      isApplicable: false,
      type: 'CATEGORY_GROSS_TOTAL',
      qualificationStatus: 'PENDING',
      qualificationMessage: `Spend ${currency} ${remaining.toFixed(2)} more on ${displayCategoryNames} products to qualify`,
      categoryNames: displayCategoryNames,
      categoryIds: categoryIds,
      remainingAmount: remaining,
      currentAmount: currentGrossTotal / 100,
      requiredAmount: requiredAmount / 100
    };
  }
}



  // Parse category line item count condition
  const categoryCountMatch = predicate.match(/lineItemCount\(categories\.id contains any \("([^"]+)"\)\)\s*>=\s*(\d+)/);
  if (categoryCountMatch) {
    const categoryId = categoryCountMatch[1];
    const requiredCount = parseInt(categoryCountMatch[2]);
    
    const category = categoryData.categories.find(cat => cat.id === categoryId);
    if (!category) {
      return {
        isApplicable: false,
        type: 'CATEGORY_COUNT',
        qualificationStatus: 'NOT_APPLICABLE',
        qualificationMessage: 'Category not found in cart'
      };
    }

    const currentCount = category.quantity;
    if (currentCount >= requiredCount) {
      return {
        isApplicable: true,
        type: 'CATEGORY_COUNT',
        qualificationStatus: 'QUALIFIED',
        categoryName: category.name
      };
    } else {
      const remaining = requiredCount - currentCount;
      return {
        isApplicable: false,
        type: 'CATEGORY_COUNT',
        qualificationStatus: 'PENDING',
        qualificationMessage: `Add ${remaining} more ${remaining === 1 ? 'item' : 'items'} from ${category.name} to qualify`,
        categoryName: category.name,
        remainingCount: remaining
      };
    }
  }

  

  // Parse category existence condition
  const categoryExistsMatch = predicate.match(/lineItemExists\(categories\.id contains "([^"]+)"\)\s*=\s*true/);
  if (categoryExistsMatch) {
    const categoryId = categoryExistsMatch[1];
    const category = categoryData.categories.find(cat => cat.id === categoryId);
    
    if (category) {
      return {
        isApplicable: true,
        type: 'CATEGORY_EXISTS',
        qualificationStatus: 'QUALIFIED',
        categoryName: category.name
      };
    } else {
      // Try to get category name from all available categories
      const categoryName = 'required category'; // You might want to fetch this from your category service
      return {
        isApplicable: false,
        type: 'CATEGORY_EXISTS',
        qualificationStatus: 'PENDING',
        qualificationMessage: `Add any item from ${categoryName} category to qualify`
      };
    }
  }

// NEW PREDICATE: Parse specific SKU count condition
const skuCountMatch = predicate.match(/lineItemCount\(sku\s*=\s*"([^"]+)"\)\s*>=\s*(\d+)/);
if (skuCountMatch) {
  const sku = skuCountMatch[1];
  const requiredCount = parseInt(skuCountMatch[2]);
  
  // Find line items with matching SKU
  const lineItems = cartData.lineItems.filter(item => 
    item.variant && item.variant.sku === sku
  );
  
  // Calculate current quantity
  const currentCount = lineItems.reduce((total, item) => total + item.quantity, 0);
  
  // Get product name if available, otherwise use SKU
  let productName = `product with SKU: ${sku}`;
  if (lineItems.length > 0 && lineItems[0].name) {
    productName = lineItems[0].name.en || lineItems[0].name["en-US"] || productName;
  }
  
  console.log(`SKU ${sku} count: ${currentCount}, required: ${requiredCount}`);
  
  if (currentCount >= requiredCount) {
    return {
      isApplicable: true,
      type: 'SKU_COUNT',
      qualificationStatus: 'QUALIFIED',
      productName: productName,
      sku: sku,
      currentCount: currentCount,
      requiredCount: requiredCount
    };
  } else {
    const remaining = requiredCount - currentCount;
    return {
      isApplicable: false,
      type: 'SKU_COUNT',
      qualificationStatus: 'PENDING',
      qualificationMessage: `Add ${remaining} more ${remaining === 1 ? 'unit' : 'units'} of ${productName} to qualify`,
      productName: productName,
      sku: sku,
      remainingCount: remaining,
      currentCount: currentCount,
      requiredCount: requiredCount
    };
  }
}



  // Default case for unrecognized predicates
  return {
    isApplicable: false,
    type: 'UNKNOWN',
    qualificationStatus: 'UNKNOWN',
    qualificationMessage: 'Unable to determine qualification requirements'
  };
}



  clearCache() {
    this.cache = {
      autoDiscounts: null,
      lastFetchTime: null,
      expiryTime: 5 * 60 * 1000
    };
  }
}

export const cartAnalysisService = new CartAnalysisService();