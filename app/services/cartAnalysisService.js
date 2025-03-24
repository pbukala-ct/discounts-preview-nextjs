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

    // Early return if this is a customer group condition
    if (predicate.includes('customer.customerGroup.key')) {
      return {
        isApplicable: false,
        type: 'CUSTOMER_GROUP',
        qualificationStatus: 'NOT_APPLICABLE',
        qualificationMessage: 'Customer group specific discount'
      };
    }

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

    // Check for customer group condition first
    if (predicate.includes('customer.customerGroup.key')) {
      return {
        isApplicable: false,
        type: 'CUSTOMER_GROUP',
        qualificationStatus: 'NOT_APPLICABLE',
        qualificationMessage: 'Customer group specific discount'
      };
    }

    // Handle combined conditions
    if (predicate.includes(' and ')) {
      const conditions = predicate.split(' and ');
      // Analyze each condition separately
      const analyses = conditions.map(condition => 
        this.analyzeCartPredicate(condition.trim(), categoryData, cartData)
      );

      // All conditions must be applicable for the discount to be applicable
      const isApplicable = analyses.every(a => a.isApplicable);
      
      // Collect all pending conditions messages
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
        qualificationMessage: pendingConditions.length > 0 
          ? `Requirements needed: ${pendingConditions.join(' and ')}` 
          : null,
        conditions: analyses
      };
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