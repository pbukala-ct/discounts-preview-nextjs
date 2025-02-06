import { useState, useEffect, useRef } from 'react';
import { apiRoot } from '../../utils/commercetools-client';

export default function CartIdForm({ onSubmit }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [applyBestPromo, setApplyBestPromo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await apiRoot
        .customers()
        .get({
          queryArgs: {
            limit: 100,
            sort: ['createdAt desc']
          }
        })
        .execute();
      
      setCustomers(response.body.results);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setIsLoading(false);
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setIsOpen(false);
    // Pass the customer.id to maintain the expected contract with parent component
    onSubmit(customer.id, applyBestPromo);
  };

  return (
    <div className="mb-6 bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-start space-x-6"> {/* Added flex container with spacing */}
        <div className="relative w-96">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-full h-10 ps-10 pe-4 text-left text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-100 focus:ring-gray-300 focus:border-gray-400"
          >
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 11 14H9a3.987 3.987 0 0 0-3.951 3.512A8.949 8.949 0 0 0 10 19zm3-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
              </svg>
            </span>
            {selectedCustomer ? selectedCustomer.email : 'Select a customer...'}
          </button>
  
          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
              <div className="max-h-60 overflow-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 cursor-pointer"
                  >
                    {customer.email}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
  
        <div className="flex-shrink-0"> {/* Added flex-shrink-0 to prevent checkbox from shrinking */}
          <label className="flex items-center space-x-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={applyBestPromo}
              onChange={(e) => setApplyBestPromo(e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span>Apply best available promo automatically</span>
          </label>
        </div>
      </div>
    </div>
  );
}
