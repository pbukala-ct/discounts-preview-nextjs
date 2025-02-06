'use client';

import { apiRoot } from '../commercetools-client'
import { useState, useEffect } from 'react';

export default function AutoTriggeredPromotions() {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAutoPromotions();
  }, []);

  const loadAutoPromotions = async () => {
    console.log('Loading auto-triggered promotions...');
    setIsLoading(true);
    setError(null);
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

      console.log('Auto-triggered promotions loaded:', response);

      if (!response || !response.body || !Array.isArray(response.body.results)) {
        throw new Error('Unexpected API response format');
      }

      const enPromotions = response.body.results.filter(promo => promo.name && promo.name.en);
      setPromotions(enPromotions);
    } catch (error) {
      console.error('Error loading auto-triggered promotions:', error);
      setError(error.message || 'An error occurred while loading promotions');
      setPromotions([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }


  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <h2 className="text-xl font-semibold px-4 py-2 bg-indigo-600 text-gray-200 border-b-2 border-indigo-300">Auto-Triggered Discount</h2>
      <p className="text-sm text-gray-600 px-4 py-2 border-b border-gray-200 bg-indigo-100">
      Discounts that are applied automatically depending on the 'active' and 'stackable' state.<span class="text-grey-900 font-semibold"></span>
      </p>
      <div className="p-6">
        {isLoading ? (
          <p className="text-center text-gray-600">Loading promotions...</p>
        ) : promotions.length === 0 ? (
          <p className="text-center text-gray-600">No auto-triggered promotions available.</p>
        ) : (
          promotions.map((promo) => (
            <div key={promo.id} className="mb-4 pb-4 border-b border-gray-200 last:border-b-0">
              {/* <h3 className="font-medium text-violet-800 mb-2">{promo.name.en}</h3> */}
              <h1 class="flex items-center text-lg font-extrabold text-gray-700">{promo.name.en}</h1>
              <div className="flex flex-wrap gap-2">
                {promo.isActive ? (
                  <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Inactive
                  </span>
                )}
                <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center ${
                  promo.stackingMode === "Stacking" 
                    ? 'text-green-800 bg-green-100' 
                    : 'text-gray-800 bg-gray-200'
                }`}>
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    {promo.stackingMode === "Stacking" ? (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    )}
                  </svg>
                  Stackable
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}