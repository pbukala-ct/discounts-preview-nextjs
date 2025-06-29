// services/discountGroupsService.js
/**
 * Service for managing Discount Groups using direct HTTP API calls
 * Since the SDK doesn't support Discount Groups yet, we use fetch directly
 */
class DiscountGroupsService {
    constructor() {
      this.projectKey = process.env.NEXT_PUBLIC_CTP_PROJECT_KEY;
      this.apiUrl = process.env.NEXT_PUBLIC_CTP_API_URL;
      this.authUrl = process.env.NEXT_PUBLIC_CTP_AUTH_URL;
      this.clientId = process.env.CTP_CLIENT_ID;
      this.clientSecret = process.env.CTP_CLIENT_SECRET;
      this.scope = process.env.NEXT_PUBLIC_CTP_SCOPES;
      
      this.accessToken = null;
      this.tokenExpiresAt = null;
    }
  
    /**
     * Get access token for API calls
     */
    async getAccessToken() {
      if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
        return this.accessToken;
      }
  
      try {
        const response = await fetch(`${this.authUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            scope: this.scope
          })
        });
  
        if (!response.ok) {
          throw new Error(`Authentication failed: ${response.status}`);
        }
  
        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
  
        return this.accessToken;
      } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
      }
    }
  
    /**
     * Make authenticated API request
     */
    async apiRequest(method, endpoint, body = null) {
      const token = await this.getAccessToken();
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
  
      const config = {
        method,
        headers
      };
  
      if (body) {
        config.body = JSON.stringify(body);
      }
  
      const response = await fetch(`${this.apiUrl}/${this.projectKey}${endpoint}`, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API request failed: ${response.status} - ${errorText}`);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
  
      return response.json();
    }
  
    /**
     * Get all discount groups
     */
    async getAllDiscountGroups() {
      try {
        const response = await this.apiRequest('GET', '/discount-groups?sort=sortOrder desc');
        
        const discountGroups = response.results.map(group => ({
          id: group.id,
          version: group.version,
          key: group.key,
          name: group.name?.en || group.name?.["en-US"] || group.name?.["en-AU"] || "Unnamed Group",
          description: group.description?.en || group.description?.["en-US"] || group.description?.["en-AU"] || '',
          sortOrder: parseFloat(group.sortOrder),
          createdAt: group.createdAt,
          lastModifiedAt: group.lastModifiedAt
        }));
  
        return {
          discountGroups,
          error: null
        };
      } catch (error) {
        console.error('Error loading discount groups:', error);
        return {
          discountGroups: [],
          error: error.message || 'An error occurred while loading discount groups'
        };
      }
    }
  
    /**
     * Create a new discount group
     */
    async createDiscountGroup(discountGroupData) {
      try {
        const body = {
          key: discountGroupData.key,
          name: {
            en: discountGroupData.name
          },
          sortOrder: discountGroupData.sortOrder.toString()
        };
  
        if (discountGroupData.description) {
          body.description = {
            en: discountGroupData.description
          };
        }
  
        const response = await this.apiRequest('POST', '/discount-groups', body);
  
        return {
          discountGroup: {
            id: response.id,
            version: response.version,
            key: response.key,
            name: response.name?.en || "Unnamed Group",
            description: response.description?.en || '',
            sortOrder: parseFloat(response.sortOrder),
            createdAt: response.createdAt,
            lastModifiedAt: response.lastModifiedAt
          },
          error: null
        };
      } catch (error) {
        console.error('Error creating discount group:', error);
        return {
          discountGroup: null,
          error: error.message || 'An error occurred while creating the discount group'
        };
      }
    }
  
    /**
     * Update a discount group with specific actions
     */
    async updateDiscountGroup(discountGroupId, version, actions) {
      try {
        const body = {
          version,
          actions
        };
  
        const response = await this.apiRequest('POST', `/discount-groups/${discountGroupId}`, body);
  
        return {
          discountGroup: {
            id: response.id,
            version: response.version,
            key: response.key,
            name: response.name?.en || "Unnamed Group",
            description: response.description?.en || '',
            sortOrder: parseFloat(response.sortOrder),
            createdAt: response.createdAt,
            lastModifiedAt: response.lastModifiedAt
          },
          error: null
        };
      } catch (error) {
        console.error('Error updating discount group:', error);
        return {
          discountGroup: null,
          error: error.message || 'An error occurred while updating the discount group'
        };
      }
    }
  
    /**
     * Update discount group name
     */
    async updateDiscountGroupName(discountGroupId, version, name) {
      const actions = [
        {
          action: 'setName',
          name: {
            en: name
          }
        }
      ];
  
      return this.updateDiscountGroup(discountGroupId, version, actions);
    }
  
    /**
     * Update discount group description
     */
    async updateDiscountGroupDescription(discountGroupId, version, description) {
      const actions = [
        {
          action: 'setDescription',
          description: description ? {
            en: description
          } : undefined
        }
      ];
  
      return this.updateDiscountGroup(discountGroupId, version, actions);
    }
  
    /**
     * Update discount group sort order
     */
    async updateDiscountGroupSortOrder(discountGroupId, version, sortOrder) {
      const actions = [
        {
          action: 'setSortOrder',
          sortOrder: sortOrder.toString()
        }
      ];
  
      return this.updateDiscountGroup(discountGroupId, version, actions);
    }
  
    /**
     * Update multiple discount group fields at once
     */
    async updateDiscountGroupFields(discountGroupId, version, fields) {
      const actions = [];
  
      if (fields.name !== undefined) {
        actions.push({
          action: 'setName',
          name: {
            en: fields.name
          }
        });
      }
  
      if (fields.description !== undefined) {
        actions.push({
          action: 'setDescription',
          description: fields.description ? {
            en: fields.description
          } : undefined
        });
      }
  
      if (fields.sortOrder !== undefined) {
        actions.push({
          action: 'setSortOrder',
          sortOrder: fields.sortOrder.toString()
        });
      }
  
      if (actions.length === 0) {
        return {
          discountGroup: null,
          error: 'No fields to update'
        };
      }
  
      return this.updateDiscountGroup(discountGroupId, version, actions);
    }
  
    /**
     * Delete a discount group
     */
    async deleteDiscountGroup(discountGroupId, version) {
      try {
        await this.apiRequest('DELETE', `/discount-groups/${discountGroupId}?version=${version}`);
  
        return {
          success: true,
          error: null
        };
      } catch (error) {
        console.error('Error deleting discount group:', error);
        return {
          success: false,
          error: error.message || 'An error occurred while deleting the discount group'
        };
      }
    }
  
    /**
     * Get cart discounts with their discount group assignments
     */
    async getCartDiscountsWithGroups() {
      try {
        const response = await this.apiRequest('GET', '/cart-discounts?expand=discountGroup&sort=sortOrder desc');
        
        const cartDiscounts = response.results
          .filter(discount => discount.name && (discount.name.en || discount.name["en-US"] || discount.name["en-AU"]))
          .map(discount => ({
            id: discount.id,
            version: discount.version,
            key: discount.key,
            name: discount.name.en || discount.name["en-US"] || discount.name["en-AU"] || "Unnamed Discount",
            description: discount.description?.en || discount.description?.["en-US"] || discount.description?.["en-AU"] || '',
            isActive: discount.isActive,
            stackingMode: discount.stackingMode,
            sortOrder: parseFloat(discount.sortOrder),
            requiresDiscountCode: discount.requiresDiscountCode,
            discountGroup: discount.discountGroup ? {
              id: discount.discountGroup.id,
              key: discount.discountGroup.key,
              name: discount.discountGroup.name?.en || discount.discountGroup.name?.["en-US"] || discount.discountGroup.name?.["en-AU"] || 'Unnamed Group',
              sortOrder: parseFloat(discount.discountGroup.sortOrder)
            } : null,
            createdAt: discount.createdAt,
            lastModifiedAt: discount.lastModifiedAt
          }));
  
        return {
          cartDiscounts,
          error: null
        };
      } catch (error) {
        console.error('Error loading cart discounts with groups:', error);
        return {
          cartDiscounts: [],
          error: error.message || 'An error occurred while loading cart discounts'
        };
      }
    }
  
    /**
     * Assign a cart discount to a discount group
     */
    async assignCartDiscountToGroup(cartDiscountId, version, discountGroupId) {
      try {
        const body = {
          version,
          actions: [
            {
              action: 'setDiscountGroup',
              discountGroup: {
                typeId: 'discount-group',
                id: discountGroupId
              }
            }
          ]
        };
  
        const response = await this.apiRequest('POST', `/cart-discounts/${cartDiscountId}`, body);
  
        return {
          cartDiscount: response,
          error: null
        };
      } catch (error) {
        console.error('Error assigning cart discount to group:', error);
        return {
          cartDiscount: null,
          error: error.message || 'An error occurred while assigning cart discount to group'
        };
      }
    }
  
    /**
     * Remove a cart discount from its discount group
     */
    async removeCartDiscountFromGroup(cartDiscountId, version) {
      try {
        const body = {
          version,
          actions: [
            {
              action: 'setDiscountGroup',
              discountGroup: null
            }
          ]
        };
  
        const response = await this.apiRequest('POST', `/cart-discounts/${cartDiscountId}`, body);
  
        return {
          cartDiscount: response,
          error: null
        };
      } catch (error) {
        console.error('Error removing cart discount from group:', error);
        return {
          cartDiscount: null,
          error: error.message || 'An error occurred while removing cart discount from group'
        };
      }
    }
  
    /**
     * Get a comprehensive view of all discounts and groups ordered by priority
     */
    async getDiscountsPriorityView() {
      try {
        const [groupsResult, cartDiscountsResult] = await Promise.all([
          this.getAllDiscountGroups(),
          this.getCartDiscountsWithGroups()
        ]);
  
        if (groupsResult.error) {
          throw new Error(groupsResult.error);
        }
  
        if (cartDiscountsResult.error) {
          throw new Error(cartDiscountsResult.error);
        }
  
        // Combine and sort by sortOrder (priority)
        const allDiscounts = [];
  
        // Add discount groups
        groupsResult.discountGroups.forEach(group => {
          allDiscounts.push({
            type: 'discount-group',
            id: group.id,
            name: group.name,
            sortOrder: group.sortOrder,
            isActive: true, // Groups themselves don't have active state
            description: group.description,
            key: group.key,
            cartDiscounts: cartDiscountsResult.cartDiscounts.filter(cd => 
              cd.discountGroup && cd.discountGroup.id === group.id
            )
          });
        });
  
        // Add cart discounts without groups
        cartDiscountsResult.cartDiscounts
          .filter(cd => !cd.discountGroup)
          .forEach(discount => {
            allDiscounts.push({
              type: 'cart-discount',
              id: discount.id,
              name: discount.name,
              sortOrder: discount.sortOrder,
              isActive: discount.isActive,
              stackingMode: discount.stackingMode,
              requiresDiscountCode: discount.requiresDiscountCode,
              description: discount.description,
              key: discount.key
            });
          });
  
        // Sort by sortOrder (highest first)
        allDiscounts.sort((a, b) => b.sortOrder - a.sortOrder);
  
        return {
          discountsPriority: allDiscounts,
          error: null
        };
      } catch (error) {
        console.error('Error loading discounts priority view:', error);
        return {
          discountsPriority: [],
          error: error.message || 'An error occurred while loading discounts priority view'
        };
      }
    }
  }
  
  export const discountGroupsService = new DiscountGroupsService();