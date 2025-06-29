'use client';
import { apiRoot } from './commercetools-client'
import Image from 'next/image';

import { useState, useCallback } from 'react';
import CartContent from './components/CartContent';
import AvailablePromotions from './components/AvailablePromotions';
import AutoTriggeredPromotions from './components/AutoTriggeredPromotions';
import DiscountGroupsManagement from './components/DiscountGroupsManagement';
import CartIdForm from './components/CartIdForm'

export default function Home() {
  const [cartData, setCartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applyBestPromo, setApplyBestPromo] = useState(false);
  const [appliedDiscountCodes, setAppliedDiscountCodes] = useState([]);
  const [activeTab, setActiveTab] = useState('cart-preview'); // 'cart-preview' or 'discount-groups'

  // Feature june25: Adding state for tracking quantity updates
  const [updatingLineItems, setUpdatingLineItems] = useState(new Set());

  const loadCartData = async (customerId, applyBestPromo) => {
    if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
      setError("Please enter a valid Customer ID");
      setCartData(null);
      return;
    }
    
    console.log('Loading cart data...');
    setIsLoading(true);
    setError(null);
    
    try {
      const cartResponse = await apiRoot
        .carts()
        .withCustomerId({customerId: customerId })
        .get({
          queryArgs: {
            expand: ['discountCodes[*].discountCode', 'discountOnTotalPrice.includedDiscounts[*].discount','lineItems[*].discountedPricePerQuantity[*].discountedPrice.includedDiscounts[*].discount','lineItems[*].price.discounted.discount'],
          }
        })
        .execute();

      // Handle successful response
      if (!cartResponse.body || !cartResponse.body.lineItems || cartResponse.body.lineItems.length === 0) {
        setError("No active cart found for this customer. Please ensure the customer has items in their cart.");
        setCartData(null);
        setAppliedDiscountCodes([]);
        return;
      }

      // Process cart data
      const cart = cartResponse.body;
      const appliedCodes = cart.discountCodes 
        ? cart.discountCodes.map(dc => dc.discountCode.obj.code)
        : [];
      setAppliedDiscountCodes(appliedCodes);
      setCartData(cart);
      setApplyBestPromo(applyBestPromo);

    } catch (error) {
      // Enhanced error handling with user-friendly messages
      let userMessage = "Unable to load cart data. ";
      
      if (error.statusCode === 404) {
        userMessage += "No cart found for this customer ID.";
      } else if (error.statusCode === 400) {
        userMessage += "Invalid customer ID format.";
      } else {
        userMessage += "Please try again or contact support if the issue persists.";
      }
      
      setError(userMessage);
      setCartData(null);
      setAppliedDiscountCodes([]);
      
      console.error('Technical error details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLineItemQuantity = useCallback(async (lineItemId, newQuantity) => {
    if (!cartData) {
      console.error('No cart data available');
      return;
    }

    // Add this line item to updating set
    setUpdatingLineItems(prev => new Set([...prev, lineItemId]));
    setError(null);

    try {
      console.log(`Updating line item ${lineItemId} to quantity ${newQuantity}`);
      
      const response = await apiRoot
        .carts()
        .withId({ ID: cartData.id })
        .post({
          queryArgs: {
            expand: ['discountCodes[*].discountCode', 'discountOnTotalPrice.includedDiscounts[*].discount','lineItems[*].discountedPricePerQuantity[*].discountedPrice.includedDiscounts[*].discount','lineItems[*].price.discounted.discount'],
          },
          body: {
            version: cartData.version,
            actions: [
              {
                action: "changeLineItemQuantity",
                lineItemId: lineItemId,
                quantity: newQuantity
              }
            ]
          }
        })
        .execute();

      // Update cart data with the response
      setCartData(response.body);
      
      // Update applied discount codes in case they changed
      const appliedCodes = response.body.discountCodes 
        ? response.body.discountCodes.map(dc => dc.discountCode.obj.code)
        : [];
      setAppliedDiscountCodes(appliedCodes);

      console.log('Line item quantity updated successfully');

    } catch (err) {
      console.error('Error updating line item quantity:', err);
      let userMessage = 'Failed to update quantity. ';
      
      if (err.statusCode === 409) {
        userMessage += 'Cart was modified by another process. Please refresh and try again.';
      } else {
        userMessage += 'Please try again.';
      }
      
      setError(userMessage);
    } finally {
      // Remove this line item from updating set
      setUpdatingLineItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(lineItemId);
        return newSet;
      });
    }
  }, [cartData]);

  const applyDiscountCode = useCallback(async (discountCode) => {
    setApplyBestPromo(false);
    setIsLoading(true);
    setError(null);
    try {

       // Check if this discount is already applied
       if (appliedDiscountCodes.includes(discountCode)) {
        console.log("Discount code already applied:", discountCode);
        return;
      }

      const response = await apiRoot
        .carts()
        .withId({ ID: cartData.id })
        .post({   
          queryArgs: {
            expand: ['discountCodes[*].discountCode', 'discountOnTotalPrice.includedDiscounts[*].discount','lineItems[*].discountedPricePerQuantity[*].discountedPrice.includedDiscounts[*].discount','lineItems[*].price.discounted.discount'],
          },
          body: {
            version: cartData.version,
            actions: [
              {
                action: "addDiscountCode",
                code: discountCode
              }
            ]
          }
        })
        .execute();
  
      setCartData(response.body);
      setAppliedDiscountCodes(prev => [...prev, discountCode]);
    } catch (err) {
      console.error('Error applying discount code:', err);
      setError(err.message || 'Failed to apply discount code');
    } finally {
      setIsLoading(false);
    }
  }, [cartData, setCartData]);

  const removeDiscountCode = async (discountCodeId) => {
    setApplyBestPromo(false);

    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRoot
        .carts()
        .withId({ ID: cartData.id })
        .post({
          queryArgs: {
            expand: ['discountCodes[*].discountCode', 'discountOnTotalPrice.includedDiscounts[*].discount','lineItems[*].discountedPricePerQuantity[*].discountedPrice.includedDiscounts[*].discount','lineItems[*].price.discounted.discount'],
          },
          body: {
            version: cartData.version,
            actions: [
              {
                action: "removeDiscountCode",
                discountCode: {
                  typeId: "discount-code",
                  id: discountCodeId
                }
              }
            ]
          }
        })
        .execute();
       // Extract applied discount codes
       const appliedCodes = response.body.discountCodes 
       ? response.body.discountCodes.map(dc => {
           return dc.discountCode.obj.code;
         })
       : [];
        setAppliedDiscountCodes(appliedCodes);

      // Update the applied discount codes state
      setAppliedDiscountCodes(appliedCodes);
  
      setCartData(response.body);
    } catch (err) {
      console.error('Error removing discount code:', err);
      setError(err.message || 'Failed to remove discount code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto py-4 px-4">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Discounts Preview Calculator</h1>
          <Image
            src="/logo.png"
            alt="commercetools"
            width={170}
            height={60}
            className="mx-auto"
          />
        </header>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 justify-center">
              <button
                onClick={() => setActiveTab('cart-preview')}
                className={`py-4 px-6 border-b-2 font-medium text-lg ${
                  activeTab === 'cart-preview'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Cart Discount Preview
              </button>
              <button
                onClick={() => setActiveTab('discount-groups')}
                className={`py-4 px-6 border-b-2 font-medium text-lg ${
                  activeTab === 'discount-groups'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Discount Groups Management
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'cart-preview' ? (
          <>
            <CartIdForm onSubmit={loadCartData} />
            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
              <div className="md:col-span-3">
                <CartContent 
                  cartData={cartData} 
                  isLoading={isLoading} 
                  onRemoveDiscount={removeDiscountCode}
                  onUpdateQuantity={updateLineItemQuantity}
                  updatingLineItems={updatingLineItems}
                />
              </div>
              <div className="md:col-span-3 space-y-8">
                <AvailablePromotions 
                  cartData={cartData} 
                  onApplyDiscount={applyDiscountCode} 
                  applyBestPromoAutomatically={applyBestPromo}
                  appliedDiscountCodes={appliedDiscountCodes}
                />
                <AutoTriggeredPromotions />
              </div>
            </div>
          </>
        ) : (
          <DiscountGroupsManagement />
        )}
      </div>
    </div>
  );
}