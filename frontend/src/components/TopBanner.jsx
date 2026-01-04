import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
} from "framer-motion";

const wrap = (min, max, v) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

function ParallaxText({ children, baseVelocity = 100 }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false,
  });

  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);

  const directionFactor = useRef(1);
  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="overflow-hidden m-0 whitespace-nowrap flex flex-nowrap">
      <motion.div 
        className="font-serif text-[13px] md:text-sm font-medium tracking-[0.15em] flex flex-nowrap whitespace-nowrap" 
        style={{ x }}
      >
        {[...Array(8)].map((_, i) => (
          <span key={i} className="block mr-12 md:mr-16">{children}</span>
        ))}
      </motion.div>
    </div>
  );
}

export default function TopBanner() {
  return (
    <div className="relative bg-gradient-to-r from-rose-50 via-pink-50 to-rose-50 text-gray-800 py-2 overflow-hidden z-50 border-b border-rose-100/50">
      {/* Subtle decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 pointer-events-none" />
      
      <ParallaxText baseVelocity={1.4}>
  <span className="font-bold">Welcome to Sera - Handcrafted with Love - Free Shipping on Orders Above INR 999</span>
</ParallaxText>

    </div>
  );
}
