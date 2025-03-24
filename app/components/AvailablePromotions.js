'use client';
import { apiRoot } from '../commercetools-client'



import { useState, useEffect } from 'react';

export default function AvailablePromotions({ cartData, onApplyDiscount, appliedDiscountCodes, applyBestPromoAutomatically }) {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [currencyCode, setCurrencyCode] = useState('AUD'); // Default fallback


  useEffect(() => {
    if (cartData) {
      if (cartData.totalPrice && cartData.totalPrice.currencyCode) {
        setCurrencyCode(cartData.totalPrice.currencyCode);
      }
      loadPromotions();
    } else {
      //setPromotions([]);
    }
  }, [cartData]);



  // const handleApplyDiscount = async (discountCode) => {
  //   await onApplyDiscount(discountCode);
  //   // Optionally, you might want to refresh the promotions list here
  //   loadPromotions();
  // };


  const loadPromotions = async () => {
    //console.log('Loading Discount Codes...');
    setIsLoading(true);
    try {
      const response = await apiRoot.discountCodes()
      .get({
        queryArgs: {
          expand: ['cartDiscounts[*]'],
        }
      })
      .execute();
      //console.log('Discount codes loaded:', response);
      
      // Filter discount codes with 'en' locale
      const enDiscountCodes = response.body.results.filter(code => 
        code.name && (code.name.en || code.name["en-US"])
      );
      
      const promotionsWithValues = await calculatePromotionValues(enDiscountCodes, cartData);
      console.log('Promotions with calculated values:', promotionsWithValues);
      const sortedPromotions = promotionsWithValues.sort((a, b) => b.discountValue - a.discountValue);

      
      setPromotions(sortedPromotions);

     // If applyBestPromoAutomatically is true, calculate and return the best promotion
     if (applyBestPromoAutomatically) {
      const bestPromo = calculateBestPromotion(promotionsWithValues);
      if (bestPromo) {
        onApplyDiscount(bestPromo.code);
      }
     
    }
    } catch (error) {
      console.error('Error loading promotions:', error);
      
    }
    finally {
      setIsLoading(false);
     
    }
  };

  const calculateBestPromotion = (promotionsWithValues) => {
    const automaticPromotions = promotionsWithValues.filter(promo => 
      promo.custom && promo.custom.fields && promo.custom.fields.isAutomatic === true
    );

    if (automaticPromotions.length === 0) {
      console.log("No automatic promotions available");
      return null;
    }

    return automaticPromotions.reduce((best, current) => 
      current.discountValue > best.discountValue ? current : best
    );
  };


  const calculatePromotionValues = async (discountCodes, cartData) => {
    //console.log('Calculating promotion values...');
    const promotionsWithValues = await Promise.all(discountCodes.map(async (code) => {
    //console.log('Processing discount code:', code.code);
    const shadowCart = await createShadowCart(cartData, code.code);
      
      let discountValue = 0;
      let cartLevelDiscount = 0;
      let itemLevelDiscounts = 0;
      let includedDiscounts = [];
      let includedItemLevelDiscounts = [];
  
      //console.log("shadowCart: " + JSON.stringify(shadowCart));
      // Check for cart-level discount
      if (shadowCart.discountOnTotalPrice?.discountedAmount?.centAmount) {
        cartLevelDiscount = shadowCart.discountOnTotalPrice.discountedAmount.centAmount / 100;
        includedDiscounts = shadowCart.discountOnTotalPrice.includedDiscounts.map(discount => ({
          name: discount.discount.obj.name.en || 
            discount.discount.obj.name['en-US'] || 
            discount.discount.obj.name['en-AU'] || 
            'Unnamed Discount',
          amount: discount.discountedAmount.centAmount / 100,
          currency: shadowCart.discountOnTotalPrice.discountedAmount.currencyCode
        }));
      } 
      // Calculate line item discounts 
      itemLevelDiscounts = shadowCart.lineItems.reduce((total, item) => {
        if (item.discountedPrice && item.discountedPrice.includedDiscounts) {
          return total + item.discountedPrice.includedDiscounts.reduce((itemTotal, discount) => {
            includedItemLevelDiscounts.push({
              skuName: item.name.en || item.name['en-US'] ,
              name: discount.discount.obj.name.en || 
              discount.discount.obj.name['en-US'] || 
              discount.discount.obj.name['en-AU'] || 
              'Unnamed Discount',
              amount: discount.discountedAmount.centAmount / 100,
              currency: discount.discountedAmount.currencyCode
              // currency: shadowCart.discountOnTotalPrice.discountedAmount.currencyCode
            });
            return itemTotal + discount.discountedAmount.centAmount / 100;
          }, 0);
        }
        return total;
      }, 0);
      

      //Delete the shadow cart as no longer required
      deleteShadowCart(shadowCart);
  
      return {
        ...code,
        totalCart: shadowCart.totalPrice.centAmount / 100,
        discountValue: cartLevelDiscount+itemLevelDiscounts,
        cartLevelDiscount,
        itemLevelDiscounts,
        includedDiscounts: includedDiscounts,
        includedItemLevelDiscounts
      };
  

    }));
    
   
    return promotionsWithValues;
  };

  const deleteShadowCart = async(shadowCart) => {
    try { 
      const response = await apiRoot
        .carts()
        .withId({ ID: shadowCart.id })
        .delete({
          queryArgs: {
            version: shadowCart.version
          }
        })
        .execute();
    }
   catch (error) {
    console.error('Error deleting shadow cart:', error);
    throw error;
  }
  }

  const createShadowCart = async (cartData, newDiscountCode) => {
    try {
      // Extract existing discount codes
      const existingDiscountCodes = cartData.discountCodes
        ? cartData.discountCodes.map(dc => dc.discountCode.obj.code)
        : [];
  
      // Combine existing discount codes with the new one, ensuring no duplicates
      const allDiscountCodes = [...new Set([...existingDiscountCodes, newDiscountCode])];
     // console.log('All discount codes:', allDiscountCodes);
      const newCart = await apiRoot
        .carts()
        .post({
          queryArgs: {
            expand: ['discountCodes[*].discountCode', 'discountOnTotalPrice.includedDiscounts[*].discount','lineItems[*].discountedPrice.includedDiscounts[*].discount'],
          },
          body: {
            currency: cartData.totalPrice.currencyCode,
            lineItems: cartData.lineItems.map(item => {
              const lineItem = {
                productId: item.productId,
                quantity: item.quantity,
              };
            
              if (item.distributionChannel?.id) {
                lineItem.distributionChannel = {
                  id: item.distributionChannel.id,
                  typeId: "channel"
                };
              }
            
              if (item.supplyChannel?.id) {
                lineItem.supplyChannel = {
                  id: item.supplyChannel.id,
                  typeId: "channel"
                };
              }
            
              return lineItem;
            }),
            discountCodes: allDiscountCodes, // Use the combined list of discount codes
            country: process.env.NEXT_PUBLIC_COUNTRY_CODE
          }
        })
        .execute();
  
      return newCart.body;
    } catch (error) {
      console.error('Error creating shadow cart:', error);
      throw error;
    }
  };

  const formatCurrency = (amount, currencyCode) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <h2 className="text-xl font-semibold px-4 py-2 bg-indigo-600 text-gray-200 border-b-2 border-indigo-300">Available Discounts (discount code based)</h2>
      <div className="border-b border-gray-200">
        <button 
          onClick={() => setIsInfoExpanded(!isInfoExpanded)}
          className="w-full flex justify-between items-center px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <span>Information about discounts</span>
          <svg 
            className={`w-5 h-5 transition-transform ${isInfoExpanded ? 'transform rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isInfoExpanded && (
          <div className="transition-all duration-300">
            <p className="text-sm text-gray-600 px-4 py-2 border-b border-gray-200 bg-indigo-200 leading-relaxed">
              Discounts that are applied automatically based on the configuration 'Apply automatically' (custom field on Discount Code) or manually using 'apply discount' button. Depending on the implementation, the "best deal" discounts might be automatically applied on the customer cart.
            </p>
            <p className="text-sm text-gray-600 px-4 py-2 border-b border-gray-200 bg-indigo-100 leading-relaxed">
              Your new <span className="text-grey-900 font-semibold">cart total</span> and the potential <span className="text-grey-900 font-semibold">discounts</span> including all active auto-triggered promotions if you apply this promotion. Breakdown shows how discount is applied, on total cart price or on line item level
            </p>
          </div>
        )}
      </div>
      <div className="p-6">
        {isLoading ? (
          <p className="text-center text-gray-600">Loading discounts...</p>
        ) : promotions.length === 0 ? (
          <p className="text-center text-gray-600">No discounts available.</p>
        ) : (
          promotions.map((promo, index) => (
            <div key={promo.id} className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">

{/* <span className="bg-blue-100 text-white text-xs font-semibold me-2 px-1.5 py-0.2 rounded dark:bg-red-400 dark:text-white-800 ms-2">Best Deal</span> */}

              <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <div className="flex items-center">
                <h1 className="flex items-center text-xl font-extrabold text-gray-700">
                  {promo.name.en || promo.name["en-US"] || "Unnamed Promotion"}
                </h1>
                  {index === 0 && (
                    <span className="bg-blue-100 text-white text-xs font-semibold me-2 px-1.5 py-0.2 rounded dark:bg-red-400 dark:text-white-800 ms-2">Best Deal</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{promo.description.en || promo.description["en-US"]}</p>
              </div>
                <div className="flex flex-col items-end space-y-1">
                  {promo.custom?.fields?.isAutomatic !== undefined && (
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center ${
                      promo.custom.fields.isAutomatic 
                        ? 'text-green-800 bg-green-100' 
                        : 'text-red-800 bg-red-100'
                    }`}>
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        {promo.custom.fields.isAutomatic ? (
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        )}
                      </svg>
                      Auto
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center ${
                    promo.cartDiscounts[0].obj.stackingMode === "Stacking" 
                      ? 'text-green-800 bg-green-100' 
                      : 'text-gray-800 bg-gray-200'
                  }`}>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      { promo.cartDiscounts[0].obj.stackingMode === "Stacking" ? (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      )}
                    </svg>
                    Stackable
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-lg font-semibold text-gray-600">Cart Total: <span className="text-gray-600 font-bold">{formatCurrency(promo.totalCart, currencyCode)}</span></p>
                    <p className="text-lg font-semibold text-gray-600">Discount Total: <span className="text-green-700 font-bold">{formatCurrency(promo.discountValue, currencyCode)}</span></p>
                  </div>
                  <div>
                    {appliedDiscountCodes.includes(promo.code) ? (
                      <button
                        disabled
                        className="px-3 py-1 bg-gray-400 text-white font-medium rounded-lg cursor-not-allowed"
                      >
                        Applied
                      </button>
                    ) : (
                      <button
                        onClick={() => onApplyDiscount(promo.code)}
                        className="px-3 py-1 bg-indigo-800 text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-indigo-300 dark:focus:ring-indigo-700 shadow-lg shadow-indigo-500/50 dark:shadow-lg dark:shadow-indigo-800/80 font-medium rounded-lg"
                      >
                        Apply Discount
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md" >
                <div className="mt-2 p-2">
                    {promo.includedDiscounts.length > 0 && (
                      <>
                        <p className="text-sm font-medium text-gray-500 mb-1">Cart Discounts:</p>
                        {promo.includedDiscounts.map((discount, idx) => (
                          <p key={idx} className="text-xs text-gray-400">
                            {discount.name}: <span className="text-gray-500 font-semibold">{formatCurrency(discount.amount, currencyCode)}</span>
                          </p>
                        ))}
                       <p className="text-sm font-semibold text-gray-900 mt-2 border-t pt-1 bg-gray-100 p-1 rounded">
                        Cart Discounts Total: 
                        <span className="text-green-800 font-semibold ml-1 text-sm">
                          {formatCurrency(
                            promo.includedDiscounts.reduce((sum, discount) => sum + discount.amount, 0),
                            currencyCode
                          )}
                        </span>
                      </p>
                      </>
                    )}
                  </div>
                <div className="mt-2">
              <p className="text-sm font-medium text-gray-500 mb-1 p-2">Product Discounts:</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1 text-left text-gray-600">SKU</th>
                    <th className="px-2 py-1 text-left text-gray-600">Discount Name</th>
                    <th className="px-2 py-1 text-right text-gray-600">Discount Value</th>
                  </tr>
                </thead>
                <tbody>
                  {promo.includedItemLevelDiscounts.map((discount, idx) => (
                    <>
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="px-2 py-1 text-gray-400">{discount.skuName}</td>
                      <td className="px-2 py-1 text-gray-400">{discount.name}</td>
                      <td className="px-2 py-1 text-right text-gray-500 font-semibold">
                        {formatCurrency(discount.amount, currencyCode)}
                      </td>
                    </tr>
                    </>
                  ))}
                </tbody>
                <tfoot>
                  {Object.entries(
                    promo.includedItemLevelDiscounts.reduce((acc, discount) => {
                      acc[discount.name] = (acc[discount.name] || 0) + discount.amount;
                      return acc;
                    }, {})
                  ).map(([name, total], idx) => (
                    <>
                    <tr key={idx} className="border-t border-gray-200 font-semibold">
                      <td className="px-2 py-1" colSpan="2">
                        Total for: <span className="text-green-800 font-semibold">{name}</span>
                      </td>
                      <td className="px-2 py-1 text-right text-gray-600">
                        {formatCurrency(total, currencyCode)}
                      </td>
                    </tr>
                    
                    </>
                  ))}


                  <tr className="border-t-2 border-gray-300 font-bold pt-1 bg-gray-100 p-1 rounded">
                    <td className="px-2 py-1 text-grey-700 font-semibold ml-1 text-sm " colSpan="2">
                      Product Discounts Total:
                    </td>
                    <td className="px-2 py-1 text-right text-green-800 text-sm">
                      {formatCurrency(
                        promo.includedItemLevelDiscounts.reduce((sum, discount) => sum + discount.amount, 0),
                        currencyCode
                      )}
                    </td>
                  </tr>
                
                </tfoot>
              </table>
              </div>
              </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}