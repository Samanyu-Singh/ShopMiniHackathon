# Data Collection Debug Guide

## Issue: No Data Being Collected on Phone

When you log in on your phone, the app should collect your Shopify data (saved products, recommendations, etc.) but it's not working.

## 🔍 **Debug Steps**

### 1. Check Console Logs
Look for these specific messages in the browser console:

```
🔍 === COLLECTOR DEBUG ===
🔍 Is Real User Data: true/false
🔍 Current User: [object]
🔍 Data Availability Check: {
  hasRecommendedProducts: true/false,
  hasSavedProducts: true/false,
  ...
}
```

### 2. Real vs Mock Data Detection
- **Real User Data**: `Is Real User Data: true` means you're logged into Shopify with real data
- **Mock Data**: `Is Real User Data: false` means you're getting test data

### 3. Data Availability Check
Look for:
- `hasSavedProducts: true` - You have saved products
- `hasRecommendedProducts: true` - You have recommendations
- `savedProductsCount: X` - Number of saved products

## 🚨 **Common Issues & Solutions**

### Issue 1: "Is Real User Data: false"
**Problem**: You're not logged into Shopify with real data
**Solution**: 
1. Make sure you're logged into the Shopify app
2. Check if you have saved products in your Shopify account
3. Try logging out and back in

### Issue 2: "No events to save"
**Problem**: No products are being collected
**Solution**:
1. Check if you have any saved products in Shopify
2. Check if you have any product lists
3. Check if you follow any shops

### Issue 3: "Mock Action" messages
**Problem**: The app is using mock data instead of real data
**Solution**:
1. Make sure you're testing on a real device, not simulator
2. Check if you're logged into the correct Shopify account
3. Try refreshing the app

## 🧪 **Testing with Sample Data**

If real data isn't available, the app will now create sample data for testing:

```
🔄 Creating sample data for testing...
📊 Created sample events: 2
✅ Saved sample data for testing
```

This means you'll see:
- Sample products in your friends feed
- Your profile will show sample products
- The app will work for testing purposes

## 🔧 **Manual Data Creation**

If you want to test with specific data, you can manually add products to the database:

```sql
-- Add a test product for your user
INSERT INTO user_feed_items (
  user_id, 
  product_id, 
  product_data, 
  source, 
  added_at
) VALUES (
  'user_revant',
  'test_product_1',
  '{"id": "test_product_1", "title": "Test Product", "price": {"amount": "29.99", "currencyCode": "USD"}, "images": [{"url": "https://example.com/image.jpg"}]}',
  'saved_products',
  NOW()
);
```

## 📱 **Phone-Specific Debugging**

### Check Authentication
1. Open the Shopify app on your phone
2. Make sure you're logged in
3. Check if you have saved products
4. Try saving a new product

### Check Network
1. Make sure you have internet connection
2. Check if the app can access Shopify APIs
3. Look for network errors in console

### Check Permissions
1. Make sure the app has permission to access your data
2. Check if you've granted necessary permissions

## 🎯 **Expected Behavior**

### When Working Correctly:
1. You log in on your phone
2. Console shows `Is Real User Data: true`
3. Console shows `hasSavedProducts: true` (if you have saved products)
4. Console shows `✅ Successfully saved X feed items`
5. Your friends can see your products in their feed

### When Using Sample Data:
1. Console shows `Is Real User Data: false`
2. Console shows `🔄 Creating sample data for testing...`
3. Console shows `✅ Saved sample data for testing`
4. Your friends see sample products in their feed

## 🆘 **Still Having Issues?**

1. **Check the console logs** and share the output
2. **Try logging out and back in** to Shopify
3. **Check if you have saved products** in your Shopify account
4. **Try on a different device** to see if it's device-specific
5. **Check the network tab** for any failed API requests

## 📞 **Contact Support**

If issues persist, provide:
- Console log output
- Whether you're getting real or mock data
- Your Shopify account type (customer, merchant, etc.)
- Device and OS information
