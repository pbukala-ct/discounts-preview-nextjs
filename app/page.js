'use client';
import { apiRoot } from './commercetools-client'
import Image from 'next/image';

import { useState,useCallback } from 'react';
import CartContent from './components/CartContent';
import AvailablePromotions from './components/AvailablePromotions';
import AutoTriggeredPromotions from './components/AutoTriggeredPromotions';
import CartIdForm from './components/CartIdForm'


export default function Home() {
  const [cartData, setCartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applyBestPromo, setApplyBestPromo] = useState(false);
  const [appliedDiscountCodes, setAppliedDiscountCodes] = useState([]);




  // useEffect(() => {
  //   loadCartData();
  // }, []);

  const loadCartData = async (customerId, applyBestPromo) => {
    if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
      setError("Please enter a valid Customer ID");
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
            expand: ['discountCodes[*].discountCode', 'discountOnTotalPrice.includedDiscounts[*].discount','lineItems[*].discountedPrice.includedDiscounts[*].discount'],
          }
        })
        .execute();

      console.log('Cart data loaded:', cartResponse.body);

      const cart = cartResponse.body;

          // Extract applied discount codes
        const appliedCodes = cart.discountCodes 
        ? cart.discountCodes.map(dc => {
            return dc.discountCode.obj.code;
          })
        : [];
      setAppliedDiscountCodes(appliedCodes);


      setCartData(cartResponse.body);
      setApplyBestPromo(applyBestPromo);

    } catch (error) {
      console.error('Error loading cart data:', error);
      setError(error.message || 'An error occurred while loading the cart');
    } finally {
      setIsLoading(false);
    }
  };


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
            expand: ['discountCodes[*].discountCode', 'discountOnTotalPrice.includedDiscounts[*].discount','lineItems[*].discountedPrice.includedDiscounts[*].discount'],
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
            expand: ['discountCodes[*].discountCode', 'discountOnTotalPrice.includedDiscounts[*].discount','lineItems[*].discountedPrice.includedDiscounts[*].discount'],
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

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (isLoading) {
    return <div>Loading cart data...</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto py-4 px-4">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Discounts Preview Calculator</h1>
          <Image
            src="/logo.png"
            alt="E-Commerce Dashboard Logo"
            width={170}
            height={60}
            className="mx-auto"
          />
        </header>

        <CartIdForm onSubmit={loadCartData} />
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <CartContent cartData={cartData} isLoading={isLoading}  onRemoveDiscount={removeDiscountCode}/>
          </div>
          <div className="space-y-8">
            <AvailablePromotions 
            cartData={cartData} 
            onApplyDiscount={applyDiscountCode} 
            applyBestPromoAutomatically={applyBestPromo}
            appliedDiscountCodes={appliedDiscountCodes}
            />
            <AutoTriggeredPromotions />
          </div>
        </div>
      </div>
    </div>
  );
}