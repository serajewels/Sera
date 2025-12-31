import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheckCircle } from 'react-icons/fa';
import confetti from 'canvas-confetti';

const OrderSuccess = () => {
  const fireConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  useEffect(() => {
    // Fire confetti after component mounts
    const timer = setTimeout(() => {
      fireConfetti();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 0.1,
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50 px-6 relative overflow-hidden">
      {/* Animated Content */}
      <motion.div
        className="flex flex-col items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Animated Check Icon */}
        <motion.div variants={iconVariants} className="relative">
          <motion.div
            className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-50"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <FaCheckCircle className="text-green-500 text-6xl mb-6 relative z-10" />
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="text-3xl md:text-4xl font-serif text-gray-900 mb-4 text-center"
        >
          Order Placed Successfully!
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-gray-600 mb-8 text-center max-w-md text-sm md:text-base"
        >
          Thank you for your purchase. Your order has been received and is being processed.
          You will receive an email confirmation shortly.
        </motion.p>

        {/* Buttons */}
        <motion.div variants={itemVariants} className="flex gap-4 flex-wrap justify-center">
          <Link
            to="/profile"
            className="bg-white text-gray-900 px-6 py-3 rounded border border-gray-200 hover:bg-gray-50 transition-colors uppercase tracking-wider text-sm font-medium shadow-sm hover:shadow-md"
          >
            View Order
          </Link>
          <Link
            to="/"
            className="bg-rose-500 text-white px-6 py-3 rounded hover:bg-rose-600 transition-colors uppercase tracking-wider text-sm font-medium shadow-lg hover:shadow-xl"
          >
            Continue Shopping
          </Link>
        </motion.div>
      </motion.div>

      {/* Background Decorative Elements */}
      <motion.div
        className="absolute top-20 left-10 w-16 h-16 md:w-20 md:h-20 bg-rose-200 rounded-full opacity-20"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-24 h-24 md:w-32 md:h-32 bg-green-200 rounded-full opacity-20"
        animate={{
          scale: [1, 1.3, 1],
          rotate: [360, 180, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      <motion.div
        className="absolute top-1/2 right-1/4 w-12 h-12 bg-yellow-200 rounded-full opacity-30"
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
};

export default OrderSuccess;
