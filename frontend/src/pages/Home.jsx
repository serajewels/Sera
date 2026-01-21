import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ============================================
// OPTIMIZED LazyImage Component (Shared)
// ============================================
const LazyImage = ({ 
  src, 
  alt, 
  className, 
  style,
  priority = false,
  srcSet = null,
  width,
  height
}) => {
  const [isLoaded, setIsLoaded] = useState(priority);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef();

  useEffect(() => {
    if (!imgRef.current) return;
    if (priority) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '100px',
        threshold: 0.01
      }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority]);

  const getOptimizedUrl = (url) => {
    if (url.includes('unsplash.com')) {
      return `${url}&q=75&auto=format&fit=crop&w=2000`;
    }
    return url;
  };

  return (
    <div 
      ref={imgRef} 
      className={className} 
      style={style}
      data-lazy={!priority}
    >
      {(isInView || priority) && (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <img
            src={getOptimizedUrl(src)}
            srcSet={srcSet}
            alt={alt}
            width={width}
            height={height}
            className={`${className} transition-opacity duration-200 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        </>
      )}
    </div>
  );
};

// ============================================
// ULTRA-OPTIMIZED GiftingSection v2
// ============================================
const GiftingSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselReady, setCarouselReady] = useState(false);
  const autoplayRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const imageCache = useRef({});

  const giftImages = useMemo(() => [
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=65&w=1200&auto=format&fit=crop&fm=webp',
    '/images/gift1.jpg',
    '/images/gift2.jpg',
    '/images/gift3.jpg',
    '/images/gift4.jpg',
    '/images/gift5.jpg'
  ], []);

  // AGGRESSIVE PRELOADING: Load active, next 2, and previous
  useEffect(() => {
    const imagesToPreload = [
      giftImages[activeIndex],
      giftImages[(activeIndex + 1) % giftImages.length],
      giftImages[(activeIndex + 2) % giftImages.length],
      giftImages[(activeIndex - 1 + giftImages.length) % giftImages.length],
    ];

    const uniqueImages = [...new Set(imagesToPreload)];

    uniqueImages.forEach((src) => {
      if (!imageCache.current[src]) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          imageCache.current[src] = true;
        };
      }
    });
  }, [activeIndex, giftImages]);

  // Smart autoplay with reset
  const resetAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);

    autoplayRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % giftImages.length);
    }, 4500);
  }, [giftImages.length]);

  useEffect(() => {
    setCarouselReady(true);
    resetAutoplay();

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [resetAutoplay]);

  const handleDotClick = useCallback((index) => {
    setActiveIndex(index);
    resetAutoplay();
  }, [resetAutoplay]);

  const handleMouseEnter = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
  }, []);

  const handleMouseLeave = useCallback(() => {
    resetAutoplay();
  }, [resetAutoplay]);

  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = e.changedTouches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    touchEndRef.current = e.changedTouches[0].clientX;
    
    if (!touchStartRef.current || !touchEndRef.current) return;
    
    const distance = touchStartRef.current - touchEndRef.current;
    const threshold = 50;

    if (Math.abs(distance) > threshold) {
      if (distance > 0) {
        setActiveIndex((prev) => (prev + 1) % giftImages.length);
      } else {
        setActiveIndex((prev) => (prev - 1 + giftImages.length) % giftImages.length);
      }
      resetAutoplay();
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [giftImages.length, resetAutoplay]);

  return (
    <section className="flex flex-col md:flex-row h-auto md:h-[600px]">
      <div 
        className="w-full md:w-1/2 h-[400px] md:h-full relative bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-64 h-80 md:w-80 md:h-96">
          {giftImages.map((img, index) => {
            const offset = index - activeIndex;
            const isActive = index === activeIndex;
            const isVisible = Math.abs(offset) <= 2;
            
            if (!isVisible) return null;
            
            return (
              <motion.div
                key={index}
                className="absolute inset-0 w-full h-full will-change-transform"
                initial={false}
                animate={{
                  rotateZ: offset * 3,
                  y: offset * 15,
                  x: offset * 10,
                  scale: isActive ? 1 : 0.9 - Math.abs(offset) * 0.05,
                  zIndex: giftImages.length - Math.abs(offset),
                }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut"
                }}
              >
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                  <img
                    src={img}
                    alt={`Gift ${index + 1}`}
                    className="w-full h-full object-cover will-change-transform"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
        
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {giftImages.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`rounded-full transition-all duration-300 cursor-pointer ${
                index === activeIndex 
                  ? 'bg-rose-500 w-8 h-2.5' 
                  : 'bg-white/60 w-2 h-2 hover:bg-white/90'
              }`}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>

        {!carouselReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="w-full md:w-1/2 bg-pink-50 flex flex-col items-center justify-center p-8 md:p-12 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-serif mb-4 md:mb-6 text-gray-900"
        >
          Ace the art of Gifting
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="max-w-md text-base md:text-lg text-gray-700 leading-relaxed mb-6 md:mb-8"
        >
          Jewellery that feels personal, packaging that looks like a celebration. Whether it's a thoughtful surprise or a spontaneous gesture, our pieces come ready to gift, no extra wrapping required.
        </motion.p>
      </div>
    </section>
  );
};

// ============================================
// HeroSection (Unchanged from before)
// ============================================
const HeroSection = () => {
  const heroImage = 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=75&w=1920&auto=format&fit=crop&fm=webp';
  
  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-900">
      <link rel="preload" as="image" href={heroImage} />
      
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ 
          backgroundImage: `url("${heroImage}")`,
          filter: 'brightness(0.6)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      />
      
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-serif mb-4 tracking-wide will-change-transform"
        >
          Welcome to Sera
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-2xl lg:text-3xl font-light tracking-widest uppercase drop-shadow-lg mb-12"
        >
          timeless elegance <span className="block md:inline font-serif italic text-rose-200">meets</span> modern intention
        </motion.p>
        
        <motion.div 
          className="absolute bottom-[25%] left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: [0, 8, 0],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
            ease: "easeInOut"
          }}
        >
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="none" 
            className="text-white/90 drop-shadow-lg"
          >
            <path 
              d="M6 9L12 15L18 9" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================
// CategoriesSection (Unchanged)
// ============================================
const CategoriesSection = () => {
  const navigate = useNavigate();
  
  const categories = useMemo(() => [
    { 
      name: 'EARRINGS', 
      img: '/images/earring.jpg',
      srcSet: '/images/earring-sm.jpg 480w, /images/earring-md.jpg 768w, /images/earring.jpg 1024w'
    },
    { 
      name: 'BRACELET', 
      img: '/images/bracelet.png',
      srcSet: '/images/bracelet-sm.png 480w, /images/bracelet-md.png 768w, /images/bracelet.png 1024w'
    },
    { 
      name: 'RINGS', 
      img: '/images/ring.png',
      srcSet: '/images/ring-sm.png 480w, /images/ring-md.png 768w, /images/ring.png 1024w'
    },
    { 
      name: 'NECKLACE', 
      img: '/images/necklace.jpg',
      srcSet: '/images/necklace-sm.jpg 480w, /images/necklace-md.jpg 768w, /images/necklace.jpg 1024w'
    },
  ], []);

  return (
    <section className="py-16 px-4 md:px-6 bg-gradient-to-b from-white to-rose-50">
      <div className="max-w-6xl mx-auto">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-serif text-center mb-3 uppercase tracking-widest text-gray-900"
        >
          Explore Categories
        </motion.h2>
        <p className="text-center text-gray-600 mb-10 text-sm md:text-base">
          Find your perfect accessory
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((cat, index) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              viewport={{ once: true }}
              onClick={() => navigate(`/shop?category=${cat.name}`)}
              className="group cursor-pointer relative"
            >
              <div className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-gray-100 shadow-md hover:shadow-xl transition-all duration-300">
                <LazyImage 
                  src={cat.img}
                  srcSet={cat.srcSet}
                  alt={cat.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 will-change-transform"
                  width={400}
                  height={533}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 md:pb-6">
                  <h3 className="text-white font-serif text-base md:text-xl tracking-widest transform group-hover:translate-y-[-4px] transition-transform duration-300">
                    {cat.name}
                  </h3>
                </div>

                <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="bg-white text-gray-900 px-4 md:px-6 py-2 rounded-full text-xs md:text-sm uppercase tracking-wider font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-lg">
                    Shop Now
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="md:hidden flex justify-center mt-8">
          <button 
            onClick={() => navigate('/shop')}
            className="inline-flex items-center justify-center px-8 py-3 rounded-full text-xs font-semibold tracking-[0.18em] uppercase
                       bg-gradient-to-r from-rose-400 via-rose-300 to-pink-300
                       text-white shadow-md shadow-rose-100
                       border border-white/50
                       hover:shadow-lg hover:shadow-rose-200 hover:brightness-110
                       active:scale-95
                       transition-all duration-200"
          >
            Shop
          </button>
        </div>
      </div>
    </section>
  );
};

// ============================================
// BentoCollectionsSection (Unchanged)
// ============================================
const BentoCollectionsSection = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  const collections = useMemo(() => [
    {
      name: 'Our Bestsellers',
      description: 'Customer favorites that never go out of style',
      img: '/images/bestsellers.jpg',
      size: 'large',
      color: 'from-rose-100 to-pink-50',
      link: '/shop?tags=bestseller'
    },
    {
      name: 'Everyday Essentials',
      description: 'Chic daily pieces',
      img: '/images/everyday.jpg',
      size: 'tall',
      color: 'from-pink-50 to-rose-50',
      link: '/shop?tags=everyday'
    },
    {
      name: 'Accent Pairs',
      description: 'Bold & beautiful',
      img: '/images/pair.jpg',
      size: 'small',
      color: 'from-rose-50 to-white',
      link: '/shop?tags=accent'
    },
    {
      name: 'Minimalist',
      description: 'Less is more',
      img: '/images/minimalist.jpg',
      size: 'small',
      color: 'from-white to-rose-50',
      link: '/shop?tags=minimalist'
    },
    {
      name: 'Boho Vibes',
      description: 'Free-spirited designs',
      img: '/images/boho.png',
      size: 'wider',
      color: 'from-rose-50 to-pink-100',
      link: '/shop?tags=boho'
    },
  ], []);

  const getSizeClasses = (size) => {
    switch(size) {
      case 'large':
        return 'col-span-2 row-span-2 md:col-span-2 md:row-span-2';
      case 'medium':
        return 'col-span-2 row-span-1 md:col-span-1 md:row-span-2';
      case 'wide':
        return 'col-span-2 row-span-1 md:col-span-2 md:row-span-1';
      case 'tall':
        return 'col-span-2 row-span-2 md:col-span-1 md:row-span-3';
      case 'wider':
        return 'col-span-2 row-span-1 md:col-span-3 md:row-span-1';
      default:
        return 'col-span-1 row-span-1';
    }
  };

  return (
    <section className="py-16 md:py-24 px-4 md:px-6 bg-gradient-to-b from-rose-50 via-white to-pink-50">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="text-3xl md:text-5xl font-serif text-center mb-4 uppercase tracking-widest text-gray-900"
      >
        Curated Collections
      </motion.h2>
      <p className="text-center text-gray-600 mb-12 md:mb-16 max-w-2xl mx-auto text-sm md:text-base px-4">
        Trendy accessories that match your vibe 
      </p>
      
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 auto-rows-[180px] md:auto-rows-[240px] gap-3 md:gap-4">
        {collections.map((collection, index) => (
          <Link
            to={collection.link}
            key={collection.name}
            className={`${getSizeClasses(collection.size)} group relative overflow-hidden rounded-3xl cursor-pointer block`}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.03 }}
              viewport={{ once: true }}
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
              className="w-full h-full relative"
            >
              <div className="absolute inset-0">
                <LazyImage 
                  src={collection.img} 
                  alt={collection.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 will-change-transform"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${collection.color} mix-blend-multiply opacity-40 group-hover:opacity-60 transition-opacity duration-300`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </div>

              <div className="absolute inset-0 p-4 md:p-6 flex flex-col justify-end">
                <motion.div
                  animate={{
                    y: hoveredIndex === index ? -10 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-white font-serif text-lg md:text-2xl mb-1 md:mb-2 tracking-wide">
                    {collection.name}
                  </h3>
                  <p className="text-white/90 text-xs md:text-sm mb-3 md:mb-4">
                    {collection.description}
                  </p>
                  
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: hoveredIndex === index ? 1 : 0,
                      y: hoveredIndex === index ? 0 : 10,
                    }}
                    transition={{ duration: 0.2 }}
                    className="bg-white text-gray-900 px-4 md:px-5 py-2 rounded-full text-xs md:text-sm uppercase tracking-wider font-medium shadow-lg hover:bg-rose-500 hover:text-white transition-colors"
                  >
                    Explore
                  </motion.button>
                </motion.div>
              </div>

              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full blur-2xl" />
            </motion.div>
          </Link>
        ))}
      </div>
    </section>
  );
};

// ============================================
// FloatingGallerySection (Unchanged)
// ============================================
const FloatingGallerySection = () => {
  const galleryItems = useMemo(() => [
    { img: '/images/gallery2.png', height: 'h-64', delay: 0 },
    { img: '/images/gallery1.png', height: 'h-80', delay: 0.05 },
    { img: '/images/gallery3.jpg', height: 'h-72', delay: 0.1 },
    { img: '/images/gallery4.jpg', height: 'h-96', delay: 0.15 },
    { img: '/images/gallery5.jpg', height: 'h-64', delay: 0.2 },
    { img: '/images/gallery6.jpg', height: 'h-88', delay: 0.25 },
  ], []);

  return (
    <section className="py-16 md:py-24 px-4 md:px-6 bg-gradient-to-b from-pink-50 to-rose-100 overflow-hidden">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="text-3xl md:text-5xl font-serif text-center mb-4 uppercase tracking-widest text-gray-900"
      >
        The Vibe
      </motion.h2>
      <p className="text-center text-gray-700 mb-12 md:mb-16 max-w-xl mx-auto text-sm md:text-base">
        Catch the energy, feel the style 
      </p>

      <div className="max-w-7xl mx-auto columns-2 md:columns-3 gap-3 md:gap-4 space-y-3 md:space-y-4">
        {galleryItems.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: item.delay }}
            viewport={{ once: true }}
            className="break-inside-avoid group"
          >
            <div className={`${item.height} relative overflow-hidden rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-500`}>
              <LazyImage
                src={item.img}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out will-change-transform"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

// ============================================
// Main Home Component
// ============================================
export default function Home() {
  return (
    <div>
      <HeroSection />
      <CategoriesSection />
      <GiftingSection />
      <BentoCollectionsSection />
      <FloatingGallerySection />
    </div>
  );
}