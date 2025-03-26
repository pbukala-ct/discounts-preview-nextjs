// services/cartService.js
import { apiRoot } from '../commercetools-client';

/**
 * Service class for handling cart-related operations
 */
class CategoryService {
  /**
   * Retrieves category information with quantity totals for products in the cart
   * @param {Object} cartData - The cart data containing line items
   * @returns {Promise<Object>} Object containing category information with quantities
   */
  /**
 * Retrieves category information with quantity totals for products in the cart
 * @param {Object} cartData - The cart data containing line items
 * @returns {Promise<Object>} Object containing category information with quantities
 */
async getCartProductCategories(cartData) {
  try {
    if (!cartData || !cartData.lineItems || !Array.isArray(cartData.lineItems)) {
      throw new Error('Invalid cart data structure');
    }

    // Create a map of productId to total quantity and price from line items
    const productQuantities = {};
    const productPrices = {};
    
    cartData.lineItems.forEach(item => {
      productQuantities[item.productId] = (productQuantities[item.productId] || 0) + item.quantity;
      productPrices[item.productId] = (productPrices[item.productId] || 0) + item.totalPrice.centAmount;
    });

    // Get unique product IDs
    const productIds = Object.keys(productQuantities);

    if (productIds.length === 0) {
      return {
        categories: [],
        totalProducts: 0
      };
    }

    // Build the query predicate for multiple products
    const predicate = productIds.map(id => `id="${id}"`).join(' or ');

    // Fetch product projections for all products in the cart
    const response = await apiRoot
      .productProjections()
      .get({
        queryArgs: {
          where: predicate,
          expand: ['categories[*]']
        }
      })
      .execute();

    if (!response.body || !response.body.results) {
      throw new Error('Unexpected API response format');
    }

    // Calculate quantities and prices per category and collect category IDs
    const categoryQuantities = {};
    const categoryPrices = {};
    const categorySet = new Set();

    response.body.results.forEach(product => {
      if (product.categories && Array.isArray(product.categories)) {
        const productQuantity = productQuantities[product.id] || 0;
        const productPrice = productPrices[product.id] || 0;
        
        product.categories.forEach(category => {
          if (category.id) {
            categorySet.add(category.id);
            categoryQuantities[category.id] = (categoryQuantities[category.id] || 0) + productQuantity;
            categoryPrices[category.id] = (categoryPrices[category.id] || 0) + productPrice;
          }
        });
      }
    });

    // Get detailed category information
    const categoryDetails = await this.getCategoryDetails(Array.from(categorySet));

    // Combine quantity and price information with category details
    const categories = categoryDetails.map(category => ({
      id: category.id,
      name: category.name?.en || category.name['en-US'] || category.name['en-AU'] || "Unknown Category",
      key: category.key || '',
      quantity: categoryQuantities[category.id] || 0,
      totalPrice: categoryPrices[category.id] || 0, // Add total price for the category
      slug: category.slug?.en || '',
      parentId: category.parent?.id || null,
      parentName: category.parent?.obj?.name?.en || null
    }));

    return {
      categories,  // Array of categories with their IDs, names, quantities, and total prices
      totalProducts: Object.values(productQuantities).reduce((sum, qty) => sum + qty, 0)
    };
  } catch (error) {
    console.error('Error fetching cart product categories:', error);
    throw error;
  }
}


  /**
 * Fetches category details by ID
 * @param {string} categoryId - The ID of the category to fetch
 * @returns {Promise<Object>} Category details or null if not found
 */
async getCategoryById(categoryId) {
  try {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    const response = await apiRoot
      .categories()
      .withId({ ID: categoryId })
      .get()
      .execute();

    if (!response.body) {
      return null;
    }

    return {
      id: response.body.id,
      version: response.body.version,
      name: response.body.name?.en || response.body.name["en-US"] || response.body.name["en-AU"] || "Unknown Category",
      slug: response.body.slug?.en || response.body.slug["en-US"] || response.body.name["en-AU"] || "",
      description: response.body.description?.en || response.body.description["en-US"] || response.body.name["en-AU"] || "",
      ancestors: response.body.ancestors || [],
      parent: response.body.parent || null
    };
  } catch (error) {
    console.error(`Error fetching category ${categoryId}:`, error);
    return null;
  }
}

  /**
   * Retrieves detailed category information for given category IDs
   * @param {string[]} categoryIds - Array of category IDs
   * @returns {Promise<Object[]>} Array of category objects with detailed information
   */
  async getCategoryDetails(categoryIds) {
    try {
      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        return [];
      }

      const predicate = categoryIds.map(id => `id="${id}"`).join(' or ');

      const response = await apiRoot
        .categories()
        .get({
          queryArgs: {
            where: predicate,
            expand: ['parent']
          }
        })
        .execute();

      if (!response.body || !response.body.results) {
        throw new Error('Unexpected API response format');
      }

      return response.body.results;
    } catch (error) {
      console.error('Error fetching category details:', error);
      throw error;
    }
  }
}

export const categoryService = new CategoryService();