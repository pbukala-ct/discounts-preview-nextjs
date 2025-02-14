import Image from 'next/image';
import { categoryService } from '../services/categoryService';
import { cartAnalysisService } from '../services/cartAnalysisService';
import { useState, useEffect } from 'react';

export default function CartContent({ cartData, isLoading, onRemoveDiscount }) {
  const [openBreakdowns, setOpenBreakdowns] = useState({});
  const [cartAnalysis, setCartAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [categoryData, setCategoryData] = useState({
    categories: [],
    totalProducts: 0
  });

  useEffect(() => {
    async function analyzeCartData() {
      if (cartData) {
        setIsAnalyzing(true);
        try {
          const analysis = await cartAnalysisService.analyzeCart(cartData);
          setCartAnalysis(analysis);
          console.log('Discount Analysis:', analysis.discountAnalysis);
        } catch (error) {
          console.error('Error analyzing cart:', error);
        } finally {
          setIsAnalyzing(false);
        }
      }
    }

  

    analyzeCartData();
  }, [cartData]);



  // console.log('Cart Data: ',cartData)
  // console.log('Categories:', cartAnalysis?.categories);
  // console.log('Total Products:', cartAnalysis?.totalProducts);
  // console.log('Auto Discounts:', cartAnalysis?.autoDiscounts);
  // console.log('Applicable Discounts:', cartAnalysis?.applicableDiscounts);

  
  const toggleBreakdown = (itemId) => {
    setOpenBreakdowns(prev => ({...prev, [itemId]: !prev[itemId]}));
  };

  if (isLoading || isAnalyzing) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-600">Loading cart data...</p>
      </div>
    );
  }

  if (!cartData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-600">No cart loaded. Selected a customer with an active cart.</p>
      </div>
    );
  }

  const formatCurrency = (amount, currencyCode) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount / 100);
  };

  // Calculate total discount and collect all discounts
  let totalDiscount = 0;
  const discounts = new Map();
// Add cart-level discounts
if (cartData.discountOnTotalPrice?.discountedAmount?.centAmount) {
  totalDiscount += cartData.discountOnTotalPrice.discountedAmount.centAmount;
  cartData.discountOnTotalPrice.includedDiscounts.forEach(discount => {
    discounts.set(discount.discount.id, {
      name: discount.discount.obj?.name?.en || 'Unnamed Discount',
      amount: discount.discountedAmount.centAmount
    });
  });
}

// Add line item discounts
cartData.lineItems.forEach(item => {
  if (item.discountedPricePerQuantity && item.discountedPricePerQuantity.length > 0) {
    item.discountedPricePerQuantity.forEach(priceQuantity => {
      if (priceQuantity.discountedPrice.includedDiscounts) {
        priceQuantity.discountedPrice.includedDiscounts.forEach(discount => {
          totalDiscount += discount.discountedAmount.centAmount;
          if (discounts.has(discount.discount.id)) {
            discounts.get(discount.discount.id).amount += discount.discountedAmount.centAmount;
          } else {
            discounts.set(discount.discount.id, {
              name: discount.discount.obj?.name?.en || 
                    discount.discount.obj?.name?.['en-US'] || 
                    'Unnamed Discount',
              amount: discount.discountedAmount.centAmount
            });
          }
        });
      }
    });
  }
});

  // Convert total discount to main currency unit
  totalDiscount = totalDiscount / 100;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <h2 className="text-xl font-semibold px-4 py-2 bg-indigo-600 text-gray-200 border-b-2 border-indigo-300">Your Cart</h2>
    <div className="p-6">
      <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
        {cartData.lineItems.map((item) => (
          <div key={item.id} className="mb-4 pb-4 border-b border-gray-200 last:border-b-0 flex items-start">
            <div className="mr-4 w-20 h-20 relative flex-shrink-0">
              <Image
                src={item.variant.images[0].url}
                alt={item.name['en-US'] || item.name['en-GB'] || item.name['en-AU']}
                layout="fill"
                objectFit="cover"
                className="rounded-md"
              />
            </div>
            <div className="flex-grow">
            <h3 className="font-medium">{item.name['en-US'] || item.name['en-GB'] || item.name['en-AU']}</h3>
            <p className="text-sm font-semibold text-gray-400 ">Retail Price: {formatCurrency(item.price.value.centAmount, item.price.value.currencyCode)}</p>
<p className="text-base font-semibold text-indigo-600">Discounted Price: {formatCurrency(item.totalPrice.centAmount, item.totalPrice.currencyCode)}</p>

        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
       {item.discountedPricePerQuantity && item.discountedPricePerQuantity.length > 0 && (
              <>
                <p className="text-sm text-green-800">
                  Total Discount on item: {formatCurrency(item.price.value.centAmount - item.discountedPricePerQuantity[0].discountedPrice.value.centAmount, item.price.value.currencyCode)}
                </p>
                <button 
                  className="text-xs text-blue-600 mt-1 focus:outline-none" 
                  onClick={() => toggleBreakdown(item.id)}
                >
                  {openBreakdowns[item.id] ? 'Hide' : 'Show'} Discount Breakdown
                </button>
                {openBreakdowns[item.id] && (
  <div className="mt-1 pl-2 border-l-2 border-gray-200">
   
    {item.price.discounted && (
      
      <p className="text-xs text-gray-500 bg-indigo-50 p-2 rounded-md mb-2">
         <p className="text-sm font-medium text-indigo-700">Product Discount:</p>
        {item.price.discounted.discount.obj.name.en}: <span className="text-indigo-600 font-bold">
          {formatCurrency(
            item.price.value.centAmount - item.price.discounted.value.centAmount,
            item.price.value.currencyCode
          )}
        </span>
      </p>
    )}
    <p className="text-sm font-medium text-gray-700">Cart Discounts:</p>
    {item.discountedPricePerQuantity[0].discountedPrice.includedDiscounts.map((discount, idx) => (
      <p key={idx} className="text-xs text-gray-500">
        {discount.discount.obj.name.en}: <span className="text-gray-600 font-bold"> {formatCurrency(
          discount.discountedAmount.centAmount,
          discount.discountedAmount.currencyCode
        )}</span>
      </p>
    ))}
  </div>
)}


              </>
            )}
</div>
          </div>
        ))}
      </div>



         {/* Potential Discounts Section */}
         <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-lg font-semibold px-4 py-2 bg-grey-50 text-indigo-700 border-b-2 border-indigo-300">
            Potential Discounts based on your cart:
          </h3>
          {cartAnalysis && cartAnalysis.discountAnalysis ? (
            <div className="mt-4 space-y-3">
              {cartAnalysis.discountAnalysis
                .filter(analysis => analysis.qualificationStatus === 'PENDING')
                .map((analysis, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-100">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-700">
                        {analysis.discount.name}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {analysis.qualificationMessage}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded-full">
                      Pending
                    </span>
                  </div>
                ))}
              {!cartAnalysis.discountAnalysis.some(analysis => analysis.qualificationStatus === 'PENDING') && (
                <p className="text-grey-600 tracking-normal italic p-2">
                  No potential discounts available at the moment
                </p>
              )}
            </div>
          ) : (
            <p className="text-grey-600 tracking-normal italic p-2">
              Loading potential discounts...
            </p>
          )}
        </div>





      <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-lg font-semibold px-4 py-2 bg-grey-50 text-indigo-700 border-b-2 border-indigo-300">Customer Applied Discounts:</h3>
          {/* <h3 className="font-semibold text-lg mb-2">Customer Applied Discounts:</h3> */}
          {cartData.discountCodes && cartData.discountCodes.length > 0 ? (
            <ul className="space-y-2">
              {cartData.discountCodes.map((discount) => (
                <li key={discount.discountCode.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span class="flex items-center text-lg font-extrabold text-gray-700">{discount.discountCode.obj.name.en}</span>
                  <button
                    onClick={() => onRemoveDiscount(discount.discountCode.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-grey-600 tracking-normal italic p-2">No discounts applied</p>
          )}
        </div>
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
        {/* <h3 className="text-lg font-semibold px-2 py-2 bg-grey-500 text-gray-200 border-b-2 border-indigo-300">All Applied Discounts:</h3> */}
        <h3 className="text-lg font-semibold px-4 py-2 bg-grey-50 text-indigo-700 border-b-2 border-indigo-300">All Applied Discounts Total:</h3>
          {discounts.size > 0 ? (
            <ul className="space-y-2">
              {Array.from(discounts.values()).map((discount, index) => (
                <li key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="flex items-center text-lg font-extrabold text-gray-700">{discount.name}</span>
                  <span className="flex items-center text-lg font-extrabold text-gray-700">{formatCurrency(discount.amount, cartData.totalPrice.currencyCode)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-grey-600 tracking-normal italic p-2">No discounts applied</p>
          )}
        </div>

        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
  <div className="flex justify-between items-center mb-2">
    <span className="text-lg text-gray-700 font-semibold">Subtotal: (without discounts)</span>
    <span className="text-lg font-semibold">
      {formatCurrency(cartData.totalPrice.centAmount + totalDiscount * 100, cartData.totalPrice.currencyCode)}
    </span>
  </div>
  <div className="flex justify-between items-center mb-2 text-green-600">
    <span className="text-lg font-bold text-gray-700">Total Discount:</span>
    <span className="text-lg font-bold ">
      -{formatCurrency(totalDiscount * 100, cartData.totalPrice.currencyCode)}
    </span>
  </div>
  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
    <span className="text-xl font-bold">Cart Total:</span>
    <span className="text-2xl font-bold">
      {formatCurrency(cartData.totalPrice.centAmount, cartData.totalPrice.currencyCode)}
    </span>
  </div>
</div>
      </div>
    </div>
  );
}