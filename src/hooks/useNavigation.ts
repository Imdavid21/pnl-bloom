import { useEffect, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  trackNavigation, 
  getNavigationContext, 
  scrollToSection,
  type NavigationContext 
} from '@/lib/navigation';

export function useNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [context, setContext] = useState<NavigationContext>(() => getNavigationContext());

  // Track navigation on route change
  useEffect(() => {
    trackNavigation(location.pathname);
    setContext(getNavigationContext());
  }, [location.pathname]);

  // Handle hash navigation for deep links
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash) {
      // Small delay to ensure content is rendered
      const timeoutId = setTimeout(() => {
        scrollToSection(hash);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [location.hash]);

  // Navigate back with fallback
  const goBack = useCallback(() => {
    if (context.previous_page) {
      navigate(context.previous_page);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [context.previous_page, navigate]);

  // Navigate to entity
  const navigateToEntity = useCallback((type: string, identifier: string) => {
    switch (type) {
      case 'wallet':
        navigate(`/wallet/${identifier.toLowerCase()}`);
        break;
      case 'tx':
        navigate(`/tx/${identifier}`);
        break;
      case 'trade':
        navigate(`/trade/${identifier}`);
        break;
      case 'market':
        navigate(`/market/${identifier.replace(/-PERP$/i, '').toUpperCase()}`);
        break;
      case 'token':
        navigate(`/token/${identifier}`);
        break;
      case 'block':
        navigate(`/block/${identifier}`);
        break;
      default:
        navigate('/');
    }
  }, [navigate]);

  // Navigate to section on current page
  const navigateToSection = useCallback((sectionId: string) => {
    navigate(`${location.pathname}#${sectionId}`, { replace: true });
    scrollToSection(sectionId);
  }, [navigate, location.pathname]);

  // Copy current URL to clipboard
  const copyCurrentUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    context,
    currentPath: location.pathname,
    previousPath: context.previous_page,
    goBack,
    navigateToEntity,
    navigateToSection,
    copyCurrentUrl,
    navigate,
  };
}

// Hook for keyboard navigation shortcuts
export function useKeyboardNavigation(
  searchInputRef?: React.RefObject<HTMLInputElement>
) {
  const { goBack, copyCurrentUrl, navigate } = useNavigation();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only handle Escape in inputs
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          searchInputRef?.current?.focus();
          break;
        case 'h':
          navigate('/');
          break;
        case 'b':
          goBack();
          break;
        case 'c':
          copyCurrentUrl();
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
        case 'Escape':
          setShowShortcuts(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goBack, copyCurrentUrl, navigate, searchInputRef]);

  return {
    showShortcuts,
    setShowShortcuts,
  };
}
