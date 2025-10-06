import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

interface TouchEvent {
  clientX: number;
  clientY: number;
  target: EventTarget | null;
}

interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
  velocity: number;
}

interface TouchInterfaceProps {
  children: React.ReactNode;
  onSwipe?: (direction: SwipeDirection) => void;
  onTap?: (event: TouchEvent) => void;
  onLongPress?: (event: TouchEvent) => void;
  onPinch?: (scale: number) => void;
  enableHapticFeedback?: boolean;
  enableSwipeGestures?: boolean;
  enablePinchZoom?: boolean;
  swipeThreshold?: number;
  longPressDelay?: number;
}

const iOSTouchInterface: React.FC<TouchInterfaceProps> = ({
  children,
  onSwipe,
  onTap,
  onLongPress,
  onPinch,
  enableHapticFeedback = true,
  enableSwipeGestures = true,
  enablePinchZoom = true,
  swipeThreshold = 50,
  longPressDelay = 500
}) => {
  const { isIOSDevice, isIPhone, isIPad } = useDeviceDetection();
  const [touchStart, setTouchStart] = useState<TouchEvent | null>(null);
  const [touchEnd, setTouchEnd] = useState<TouchEvent | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [pinchStart, setPinchStart] = useState<{ distance: number; scale: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Vérifier si les optimisations iOS sont nécessaires
  const needsIOSOptimizations = isIOSDevice();

  useEffect(() => {
    if (!needsIOSOptimizations) return;

    // Appliquer les classes CSS pour iOS
    if (containerRef.current) {
      containerRef.current.classList.add('ios-device');
      if (isIPhone()) containerRef.current.classList.add('iphone');
      if (isIPad()) containerRef.current.classList.add('ipad');
    }
  }, [needsIOSOptimizations, isIPhone, isIPad]);

  // Gestion du haptic feedback
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || !needsIOSOptimizations) return;

    try {
      // Vibration simple pour le haptic feedback
      if (navigator.vibrate) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30]
        };
        navigator.vibrate(patterns[type]);
      }
    } catch (error) {
      console.warn('⚠️ Haptic feedback non disponible:', error);
    }
  }, [enableHapticFeedback, needsIOSOptimizations]);

  // Gestion du début de touch
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!needsIOSOptimizations) return;

    const touch = event.touches[0];
    const touchEvent: TouchEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      target: touch.target
    };

    setTouchStart(touchEvent);
    setTouchEnd(null);

    // Démarrer le timer pour le long press
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        setIsLongPressing(true);
        triggerHapticFeedback('medium');
        onLongPress(touchEvent);
      }, longPressDelay);
    }

    // Gestion du pinch zoom
    if (enablePinchZoom && event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      setPinchStart({ distance, scale: 1 });
    }
  }, [needsIOSOptimizations, onLongPress, enablePinchZoom, longPressDelay, triggerHapticFeedback]);

  // Gestion du mouvement de touch
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!needsIOSOptimizations) return;

    const touch = event.touches[0];
    const touchEvent: TouchEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      target: touch.target
    };

    setTouchEnd(touchEvent);

    // Annuler le long press si l'utilisateur bouge
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Gestion du pinch zoom
    if (enablePinchZoom && event.touches.length === 2 && pinchStart) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const scale = distance / pinchStart.distance;
      
      if (onPinch) {
        onPinch(scale);
      }
    }
  }, [needsIOSOptimizations, enablePinchZoom, pinchStart, onPinch]);

  // Gestion de la fin de touch
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!needsIOSOptimizations) return;

    // Nettoyer le timer du long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const touch = event.changedTouches[0];
    const touchEvent: TouchEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      target: touch.target
    };

    setTouchEnd(touchEvent);

    // Détecter le tap
    if (onTap && touchStart && !isLongPressing) {
      const timeDiff = Date.now() - (touchStart as any).timestamp;
      if (timeDiff < 300) { // Tap si moins de 300ms
        triggerHapticFeedback('light');
        onTap(touchEvent);
      }
    }

    // Détecter le swipe
    if (enableSwipeGestures && onSwipe && touchStart && touchEnd) {
      const swipeDirection = detectSwipeDirection(touchStart, touchEnd, swipeThreshold);
      if (swipeDirection.direction) {
        triggerHapticFeedback('medium');
        onSwipe(swipeDirection);
      }
    }

    // Réinitialiser les états
    setTouchStart(null);
    setTouchEnd(null);
    setIsLongPressing(false);
    setPinchStart(null);
  }, [needsIOSOptimizations, onTap, onSwipe, enableSwipeGestures, touchStart, touchEnd, isLongPressing, swipeThreshold, triggerHapticFeedback]);

  // Détection de la direction du swipe
  const detectSwipeDirection = (start: TouchEvent, end: TouchEvent, threshold: number): SwipeDirection => {
    const deltaX = end.clientX - start.clientX;
    const deltaY = end.clientY - start.clientY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / (Date.now() - (start as any).timestamp || 1);

    if (distance < threshold) {
      return { direction: null, distance, velocity };
    }

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > absDeltaY) {
      return {
        direction: deltaX > 0 ? 'right' : 'left',
        distance,
        velocity
      };
    } else {
      return {
        direction: deltaY > 0 ? 'down' : 'up',
        distance,
        velocity
      };
    }
  };

  // Nettoyage des timers
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  if (!needsIOSOptimizations) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className="ios-touch-interface"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: enablePinchZoom ? 'manipulation' : 'pan-x pan-y',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {children}
    </div>
  );
};

// Composant pour les boutons tactiles optimisés iOS
interface iOSTouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const iOSTouchButton: React.FC<iOSTouchButtonProps> = ({
  children,
  onClick,
  onLongPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const { isIOSDevice } = useDeviceDetection();
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = useCallback(() => {
    if (disabled) return;
    setIsPressed(true);
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;
    setIsPressed(false);
  }, [disabled]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    onClick?.();
  }, [disabled, onClick]);

  const handleLongPress = useCallback(() => {
    if (disabled) return;
    onLongPress?.();
  }, [disabled, onLongPress]);

  if (!isIOSDevice()) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`btn btn-${variant} btn-${size} ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <iOSTouchInterface
      onTap={handleClick}
      onLongPress={handleLongPress}
      enableHapticFeedback={true}
    >
      <button
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={disabled}
        className={`
          ios-touch-button
          btn-${variant}
          btn-${size}
          ${isPressed ? 'pressed' : ''}
          ${disabled ? 'disabled' : ''}
          ${className}
        `}
        style={{
          minHeight: '44px', // Taille minimale recommandée par Apple
          minWidth: '44px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isPressed ? 'scale(0.96)' : 'scale(1)',
          opacity: isPressed ? 0.8 : 1
        }}
      >
        {children}
      </button>
    </iOSTouchInterface>
  );
};

// Composant pour les cartes tactiles optimisées iOS
interface iOSTouchCardProps {
  children: React.ReactNode;
  onTap?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  className?: string;
}

export const iOSTouchCard: React.FC<iOSTouchCardProps> = ({
  children,
  onTap,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  className = ''
}) => {
  const { isIOSDevice } = useDeviceDetection();

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (direction.direction === 'left' && onSwipeLeft) {
      onSwipeLeft();
    } else if (direction.direction === 'right' && onSwipeRight) {
      onSwipeRight();
    }
  }, [onSwipeLeft, onSwipeRight]);

  if (!isIOSDevice()) {
    return (
      <div className={`card ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <iOSTouchInterface
      onTap={onTap}
      onSwipe={handleSwipe}
      onLongPress={onLongPress}
      enableSwipeGestures={true}
      enableHapticFeedback={true}
    >
      <div className={`ios-touch-card card ${className}`}>
        {children}
      </div>
    </iOSTouchInterface>
  );
};

// Composant pour les listes tactiles optimisées iOS
interface iOSTouchListProps {
  children: React.ReactNode;
  onItemTap?: (index: number) => void;
  onItemSwipeLeft?: (index: number) => void;
  onItemSwipeRight?: (index: number) => void;
  onItemLongPress?: (index: number) => void;
  className?: string;
}

export const iOSTouchList: React.FC<iOSTouchListProps> = ({
  children,
  onItemTap,
  onItemSwipeLeft,
  onItemSwipeRight,
  onItemLongPress,
  className = ''
}) => {
  const { isIOSDevice } = useDeviceDetection();

  if (!isIOSDevice()) {
    return (
      <div className={`list ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`ios-touch-list list ${className}`}>
      {React.Children.map(children, (child, index) => (
        <iOSTouchInterface
          key={index}
          onTap={() => onItemTap?.(index)}
          onSwipe={(direction) => {
            if (direction.direction === 'left' && onItemSwipeLeft) {
              onItemSwipeLeft(index);
            } else if (direction.direction === 'right' && onItemSwipeRight) {
              onItemSwipeRight(index);
            }
          }}
          onLongPress={() => onItemLongPress?.(index)}
          enableSwipeGestures={true}
          enableHapticFeedback={true}
        >
          {child}
        </iOSTouchInterface>
      ))}
    </div>
  );
};

export default iOSTouchInterface;











