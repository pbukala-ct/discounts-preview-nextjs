// services/promotionsService.js
import { apiRoot } from '../commercetools-client';

/**
 * Service class for handling promotion-related operations
 */
class CartDiscounts {
  /**
   * Retrieves all auto-triggered promotions (cart discounts without discount codes)
   * @returns {Promise<{promotions: Array, error: string|null}>} Object containing promotions array and potential error
   */
  async getAutoTriggeredDiscounts() {
    try {
      if (!apiRoot || typeof apiRoot.cartDiscounts !== 'function') {
        throw new Error('API client is not properly initialized');
      }

      const response = await apiRoot
        .cartDiscounts()
        .get({
          queryArgs: {
            where: 'requiresDiscountCode=false',
          }
        })
        .execute();

      if (!response || !response.body || !Array.isArray(response.body.results)) {
        throw new Error('Unexpected API response format');
      }


    // Filter promotions to include those with English names in either 'en' or 'en-US' format
    const enPromotions = response.body.results.filter(promo => 
      (promo.name && (promo.name.en || promo.name["en-US"]))
    );
      console.log('Filtered promotions:', enPromotions);

      return {
        promotions: enPromotions.map(promo => ({
          id: promo.id,
          version: promo.version,
          name: promo.name.en || promo.name["en-US"] || "Unnamed Promotion",
          description: promo.description?.en || '',
          cartPredicate: promo.cartPredicate,
          isActive: promo.isActive,
          stackingMode: promo.stackingMode,
          validFrom: promo.validFrom,
          validUntil: promo.validUntil,
          target: promo.target,
          value: promo.value
        })),
        error: null
      };
    } catch (error) {
      console.error('Error loading auto-triggered promotions:', error);
      return {
        promotions: [],
        error: error.message || 'An error occurred while loading promotions'
      };
    }
  }
}

export const cartDiscounts = new CartDiscounts();