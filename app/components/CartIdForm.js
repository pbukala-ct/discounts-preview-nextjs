// components/CartIdForm.js
import { useState } from 'react';

export default function CartIdForm({ onSubmit }) {
  const [cartId, setCartId] = useState('');
  const [applyBestPromo, setApplyBestPromo] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);


  const testCustomerId = '66ee98cf-a333-4dea-8f07-52a608c77990'; 
  const testCustomerName = 'piotr.bukala@commercetools.com';
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(cartId,applyBestPromo);
  };

  const loadTestId = () => {
    setCartId(testCustomerId);
  };


  if (applyBestPromo) {
    // Add logic here to apply the best available promotion
    console.log('Applying best available promotion');
    // You might want to call an API or dispatch an action here
  }


  return (
    <div className="mb-6 bg-white p-6 rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="mb-4">
        <label htmlFor="search" className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
        <div className="relative">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
            </svg>
          </div>
          <input 
            type="search" 
            id="search" 
            value={cartId}
            onChange={(e) => setCartId(e.target.value)}
            placeholder="Enter Customer ID"
            className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-100 focus:ring-gray-300 focus:border-gray-400"
          />
          <button 
            type="submit" 
            className="text-white absolute end-2.5 bottom-2.5 bg-gray-700 hover:bg-gray-900 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-4 py-2"
          >
            Load Cart
          </button>
          </div>
      </form>

      <div className="mt-4">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center text-sm text-gray-600 focus:outline-none"
        >
          <svg
            className={`w-4 h-4 mr-2 transition-transform ${isCollapsed ? '' : 'transform rotate-90'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <h3 className="font-semibold text-gray-700 mb-2">Demo Configuration Options</h3>
        </button>
        
        {!isCollapsed && (
          <div className="mt-2 pl-6 bg-gray-100 p-3 rounded-lg text-sm">
            <div className="text-sm text-gray-600 flex items-center space-x-4">
              <p>Test Customer ID: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{testCustomerName}</span></p>
              <button
                onClick={loadTestId}
                className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-3 py-2 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
              >
                Load Test ID
              </button>
            </div>
            <label className="flex items-center space-x-2 text-sm text-gray-700 mt-2">
              <input
                type="checkbox"
                checked={applyBestPromo}
                onChange={(e) => setApplyBestPromo(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span>Apply best available promo automatically</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}