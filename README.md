# 🛍️ StyleSync - Social Shopping Experience

<div align="center">

![Shop With Me Banner](https://img.shields.io/badge/Shop%20Mini-Hackathon%20Project-blue?style=for-the-badge&logo=shopify)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178C6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.0.8-646CFF?style=for-the-badge&logo=vite)

**A revolutionary social shopping platform that lets you discover products through your friends' curated feeds**

</div>

---

## 🎥 Demo Video

<div align="center">

### 📱 Watch the Full Demo

<div align="center">

[![StyleSync Demo](https://img.youtube.com/vi/hnWM-A2e35U/0.jpg)](https://www.youtube.com/watch?v=hnWM-A2e35U)

*Click the image above to watch the full demo video showcasing StyleSync in action!*

</div>



</div>

---

## ✨ What is StyleSync?

StyleSync transforms the way you discover products by leveraging the power of social connections. Instead of browsing generic recommendations, explore curated product feeds from friends whose style and taste you trust.

### 🎯 The Vision

Imagine having friends with impeccable fashion sense or great taste in tech gadgets. With Shop With Me, you can hop into their personalized product feeds and discover amazing items that align with your interests, all through the lens of people you trust.

---

## 🚀 Key Features

### 👥 **Friend Feed Discovery**
- Browse through your friends' personalized product recommendations
- Switch between different friends' feeds with a single tap
- Discover products curated by people whose style you admire

### 🛍️ **Social Product Sharing**
- Share your favorite products with friends
- Vote on shared items to help friends make better decisions
- Create collaborative shopping experiences

### 📱 **Modern Mobile-First Design**
- Beautiful, intuitive interface inspired by modern social apps
- Dark mode support for comfortable browsing
- Smooth animations and haptic feedback

### 🔍 **Smart Product Discovery**
- Personalized product recommendations
- Search through your saved and recommended products
- Filter and organize your shopping experience

### 👤 **Rich User Profiles**
- Customizable profiles with style preferences
- Activity tracking and feed statistics
- Friend management and invitations

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Platform**: Shopify Shop Minis SDK

---

## 📋 Prerequisites

⚠️ **Important Note**: This project requires access to the Shopify Shop Minis SDK, which is currently not publicly available. The demo video showcases the full functionality and features of the application.

To run this project locally, you would need:
- Access to the `@shopify/shop-minis-react` SDK
- Shopify Partner account with Shop Minis access
- Node.js 18+ and npm/yarn

---

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ShopMiniHackathon--Shop-Go-.git
cd ShopMiniHackathon--Shop-Go-/shop-with-me

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Setup

Create a `.env` file in the `shop-with-me` directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

The project includes several SQL files for database setup:

- `complete-database-schema.sql` - Complete database schema
- `friends-system-schema.sql` - Friends and social features
- `shared-items-schema.sql` - Product sharing functionality
- `voting-feature-schema.sql` - Voting system for shared items

---

## 🏗️ Project Structure

```
shop-with-me/
├── src/
│   ├── components/
│   │   ├── Collector.tsx          # Product collection interface
│   │   ├── Friends.tsx            # Friends management
│   │   ├── FriendsFeed.tsx        # Friend's product feed
│   │   ├── Profile.tsx            # User profile management
│   │   ├── SharedItemsFeed.tsx    # Shared products feed
│   │   ├── ShareItemModal.tsx     # Product sharing modal
│   │   ├── Stories.tsx            # Product stories feature
│   │   ├── ThemeToggle.tsx        # Dark/light mode toggle
│   │   └── UserFeed.tsx           # Personal product feed
│   ├── lib/
│   │   └── supa.ts                # Supabase configuration
│   └── App.tsx                    # Main application component
├── *.sql                          # Database schema files
└── package.json                   # Dependencies and scripts
```

---

## 🎨 Features in Detail

### Friend Feed System
- **Dynamic Feed Switching**: Seamlessly switch between different friends' product feeds
- **Personalized Recommendations**: Each friend's feed shows products tailored to their preferences
- **Real-time Updates**: Feeds update as friends discover new products

### Social Features
- **Product Sharing**: Share interesting products with your network
- **Voting System**: Help friends make decisions by voting on shared items
- **Activity Tracking**: See what your friends are discovering and liking

### User Experience
- **Modern UI/UX**: Clean, intuitive interface with smooth animations
- **Responsive Design**: Optimized for mobile and desktop experiences
- **Accessibility**: Built with accessibility best practices in mind

---

## 🔮 Future Enhancements

- **AI-Powered Recommendations**: Machine learning to suggest products based on friend interactions
- **Group Shopping**: Create shopping groups for collaborative purchases
- **Integration APIs**: Connect with more e-commerce platforms
- **Advanced Analytics**: Detailed insights into shopping patterns and preferences

---

## 🤝 Contributing

This project was created for the Shopify Shop Mini Hackathon. While the SDK is not publicly available, we welcome discussions about the concept and potential improvements!

### Development Guidelines
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Maintain component reusability
- Write clean, documented code

---

## 📄 License

This project is part of the Shopify Shop Mini Hackathon and is subject to Shopify's terms and conditions.

---

## 👨‍💻 Team

**Shop Mini Hackathon Team:**
- **Revant Patel** -  Developer 
- **Samanyu Singh** - Developer
- **Satvik Sandru** - Developer

---

## 🙏 Acknowledgments

- **Shopify** for providing the Shop Minis platform
- **Supabase** for the excellent database and backend services
- **Vite** for the fast development experience
- **Tailwind CSS** for the beautiful styling framework

---

<div align="center">

**🌟 Ready to revolutionize social shopping? Watch the demo video above to see Shop With Me in action!**

*This project demonstrates the future of social commerce - where discovery happens through trusted connections rather than algorithms.*

</div>
