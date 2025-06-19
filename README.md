# commercetools Discount Calculator

A comprehensive discount analysis and promotion planning tool for commercetools-powered e-commerce platforms. This application provides business users with detailed insights into discount breakdowns and promotional strategies through real-time cart analysis and shadow cart simulations.

## Overview

The commercetools Discount Calculator is designed to help business users, marketing teams, and e-commerce managers understand how different promotional strategies impact cart totals and customer experiences. By leveraging commercetools' powerful discount engine and shadow cart capabilities, this tool provides actionable insights for optimizing promotional campaigns.

## Key Features

### 🛒 **Cart Discount Analysis**
- **Detailed Breakdown Display**: Comprehensive visualization of all applied discounts (product-level and cart-level)
- **Multi-level Discount Support**: Handles complex scenarios with mixed discount types on single line items
- **Real-time Calculations**: Live updates as cart contents change
- **Interactive Drill-down**: Expandable sections showing per-unit and total discount amounts

### 🎯 **Available Promotions Component**
- **Shadow Cart Simulation**: Uses commercetools shadow carts to pre-calculate discount outcomes
- **Coupon-based Analysis**: Shows potential savings from available coupon codes
- **Best Discount Discovery**: Automatically identifies optimal discount combinations for customer's current cart
- **Promotional Impact Preview**: Visualizes potential cart total changes before applying promotions

### ⚡ **Auto-Triggered Promotions**
- **Automatic Discount Detection**: Identifies promotions that trigger based on cart contents
- **Threshold Analysis**: Shows progress toward promotional thresholds (e.g., "Add $20 more for free shipping")
- **Real-time Eligibility**: Dynamic updates as cart composition changes


## Technical Architecture

### Frontend Stack
- **React**: Component-based UI with modern hooks
- **Tailwind CSS**: Utility-first styling for rapid UI development
- **JavaScript**: ES6+ 

### Backend Integration
- **commercetools API**: Full integration with commercetools Composable Commerce
- **Shadow Cart API**: Calculating coupon based discounts creating shadow carts (deleted after discount is calculated)
- **Discount Engine**: Utilizes commercetools' native discount calculation capabilities


## Important Limitations & Disclaimers

⚠️ **This is NOT production-grade business logic**

This application serves as a demonstration and business analysis tool with several important limitations:

### 🌍 **Locale Handling Limitations**
- **Limited Language Support**: Currently handles only `en`, `en-US`, and `en-AU` locales
- **Hardcoded Fallbacks**: Missing comprehensive internationalization framework
- **Currency Formatting**: Basic implementation without full locale-specific formatting
- **Production Recommendation**: Implement robust i18n framework for global deployment

### ⚡ **Performance & Scalability Concerns**
- **Product-level Promotions**: Would require Redis caching for scalable promotion lookups in high-traffic scenarios
- **Client-side Calculations**: Some business logic performed client-side for demo purposes
- **Memory Usage**: Not optimized for large catalogs or complex promotion hierarchies

### 🏗️ **Architecture Limitations**
- **Mixed Concerns**: Business logic and presentation layer are currently combined
- **No API Abstraction**: Direct commercetools API integration without abstraction layer
- **Limited Error Handling**: Basic error scenarios covered, missing comprehensive edge case handling
- **Security Considerations**: API keys and sensitive data handling needs production hardening

## Roadmap & Next Steps

### 🎯 **Planned Improvements**
1. **API Separation**
   - Extract business logic into dedicated REST APIs
   - Implement proper frontend/backend separation
   - Add comprehensive API documentation

2. **Performance Optimization**
   - Implement Redis caching for frequent promotion lookups
   - Optimize rendering for large discount lists



## Use Cases

### For Business Users
- **Promotion Planning**: Design and test promotional campaigns before launch
- **Revenue Impact Analysis**: Understand how discounts affect profitability
- **Customer Experience Optimization**: Ensure promotions enhance shopping experience


## Installation & Setup

```bash
# Clone the repository
git clone [repository-url]
cd commercetools-discount-calculator

# Install dependencies
npm install

# Configure commercetools credentials
cp .env.example .env
# Edit .env with your commercetools project credentials

# Start development server
npm run dev
```

## Configuration

```javascript
// Configure commercetools connection
const commercetoolsConfig = {
  projectKey: 'your-project-key',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  apiUrl: 'https://api.{region}.commercetools.com',
  authUrl: 'https://auth.{region}.commercetools.com'
};
```


## License

This project is intended for educational and demonstration purposes. Please ensure compliance with commercetools licensing terms when using their APIs.

---

**Disclaimer**: This tool is designed for business analysis and promotional planning. All discount calculations should be validated through commercetools' official APIs before implementing in production environments.