/**
 * HelpProvider - Context for managing help content across the app
 *
 * Provides centralized access to help content and tooltips.
 * Allows overriding default content and adding custom terms.
 *
 * @example
 * // Wrap your app with HelpProvider
 * <HelpProvider customContent={{ myTerm: { term: 'My Term', explanation: '...' }}}>
 *   <App />
 * </HelpProvider>
 *
 * // In components, use the hook
 * const { getHelp, addHelp } = useHelp();
 * const tuHelp = getHelp('TU');
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { HELP_CONTENT, getHelpContent } from './helpContent';

// Create context
const HelpContext = createContext(null);

/**
 * HelpProvider Component
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {object} props.customContent - Additional help content to merge
 * @param {string} props.baseDocsUrl - Base URL for learn more links
 */
export function HelpProvider({
  children,
  customContent = {},
  baseDocsUrl = '',
}) {
  // Merge default content with custom content
  const [helpContent, setHelpContent] = useState(() => ({
    ...HELP_CONTENT,
    ...customContent,
  }));

  // State for tracking which tooltip is currently active (for mobile)
  const [activeTooltip, setActiveTooltip] = useState(null);

  /**
   * Get help content for a term
   * @param {string} termKey - The term key
   * @returns {object|null} - Help content or null
   */
  const getHelp = useCallback(
    (termKey) => {
      const content = helpContent[termKey];
      if (!content) return null;

      // Resolve learn more URL with base
      if (content.learnMoreUrl && baseDocsUrl && !content.learnMoreUrl.startsWith('http')) {
        return {
          ...content,
          learnMoreUrl: `${baseDocsUrl}${content.learnMoreUrl}`,
        };
      }

      return content;
    },
    [helpContent, baseDocsUrl]
  );

  /**
   * Add or update help content
   * @param {string} termKey - The term key
   * @param {object} content - Help content { term, explanation, learnMoreUrl? }
   */
  const addHelp = useCallback((termKey, content) => {
    setHelpContent((prev) => ({
      ...prev,
      [termKey]: content,
    }));
  }, []);

  /**
   * Batch add help content
   * @param {object} content - Object of term keys to help content
   */
  const addHelpBatch = useCallback((content) => {
    setHelpContent((prev) => ({
      ...prev,
      ...content,
    }));
  }, []);

  /**
   * Remove help content
   * @param {string} termKey - The term key to remove
   */
  const removeHelp = useCallback((termKey) => {
    setHelpContent((prev) => {
      const { [termKey]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Check if help exists for a term
   * @param {string} termKey - The term key
   * @returns {boolean}
   */
  const hasHelp = useCallback(
    (termKey) => {
      return Boolean(helpContent[termKey]);
    },
    [helpContent]
  );

  /**
   * Get all available help terms
   * @returns {string[]} - Array of term keys
   */
  const getAllTerms = useCallback(() => {
    return Object.keys(helpContent);
  }, [helpContent]);

  /**
   * Open a tooltip (for mobile coordination)
   * @param {string} id - Tooltip identifier
   */
  const openTooltip = useCallback((id) => {
    setActiveTooltip(id);
  }, []);

  /**
   * Close the active tooltip
   */
  const closeTooltip = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  /**
   * Check if a tooltip is active
   * @param {string} id - Tooltip identifier
   * @returns {boolean}
   */
  const isTooltipActive = useCallback(
    (id) => {
      return activeTooltip === id;
    },
    [activeTooltip]
  );

  // Memoize context value
  const value = useMemo(
    () => ({
      // Content access
      getHelp,
      hasHelp,
      getAllTerms,

      // Content management
      addHelp,
      addHelpBatch,
      removeHelp,

      // Tooltip coordination
      activeTooltip,
      openTooltip,
      closeTooltip,
      isTooltipActive,

      // Config
      baseDocsUrl,
    }),
    [
      getHelp,
      hasHelp,
      getAllTerms,
      addHelp,
      addHelpBatch,
      removeHelp,
      activeTooltip,
      openTooltip,
      closeTooltip,
      isTooltipActive,
      baseDocsUrl,
    ]
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

/**
 * Hook to access help context
 * @returns {object} Help context value
 */
export function useHelp() {
  const context = useContext(HelpContext);

  if (!context) {
    // Return a fallback that works without provider
    return {
      getHelp: getHelpContent,
      hasHelp: (key) => Boolean(HELP_CONTENT[key]),
      getAllTerms: () => Object.keys(HELP_CONTENT),
      addHelp: () => {},
      addHelpBatch: () => {},
      removeHelp: () => {},
      activeTooltip: null,
      openTooltip: () => {},
      closeTooltip: () => {},
      isTooltipActive: () => false,
      baseDocsUrl: '',
    };
  }

  return context;
}

/**
 * HOC to provide help to a component
 * @param {React.Component} Component
 * @param {object} helpConfig - Help configuration
 */
export function withHelp(Component, helpConfig = {}) {
  return function WithHelpComponent(props) {
    const help = useHelp();
    return <Component {...props} help={help} {...helpConfig} />;
  };
}

export default HelpProvider;
