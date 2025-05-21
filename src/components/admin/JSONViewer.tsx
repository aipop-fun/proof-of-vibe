/* eslint-disable @typescript-eslint/ban-ts-comment*/
// @ts-nocheck

"use client";

import { useState, useCallback, useMemo } from 'react';

interface JSONViewerProps {
  data: Record<string, unknown>;
  initialExpanded?: boolean;
  maxDepth?: number;
  filter?: string;
  className?: string;
}

interface FormattedNode {
  key: string | number;
  value: unknown;
  type: string;
  depth: number;
  expanded: boolean;
  path: string;
}

export function JSONViewer({
  data,
  initialExpanded = false,
  maxDepth = 2,
  filter = '',
  className = ''
}: JSONViewerProps) {
  // Track expanded nodes by their path
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  
  // Helper to collect all possible paths in the data
  const collectAllPaths = useCallback((obj: unknown, path: string = ''): string[] => {
    if (obj === null || typeof obj !== 'object') return [];
    
    let paths: string[] = [];
    
    for (const key in obj as Record<string, unknown>) {
      const childPath = path ? `${path}.${key}` : key;
      paths.push(childPath);
      
      if ((obj as Record<string, unknown>)[key] !== null && typeof (obj as Record<string, unknown>)[key] === 'object') {
        paths = [...paths, ...collectAllPaths((obj as Record<string, unknown>)[key], childPath)];
      }
    }
    
    return paths;
  }, []);
  
  // Generate flattened nodes structure
  const buildNodes = useCallback((
    obj: unknown,
    currentPath: string = '',
    currentDepth: number = 0
  ): FormattedNode[] => {
    if (currentDepth > 10) return []; // Protect against circular references
    
    const nodes: FormattedNode[] = [];
    const type = Array.isArray(obj) ? 'array' : typeof obj;
    const isObject = type === 'object' && obj !== null;
    
    // Check if this path should be expanded
    const defaultExpanded = initialExpanded || currentDepth < maxDepth;
    const isExpanded = expandedPaths.has(currentPath) || 
      (currentPath && defaultExpanded && !expandedPaths.has(`!${currentPath}`));
    
    // Add this node if not root
    if (currentPath) {
      const key = currentPath.split('.').pop() || '';
      
      nodes.push({
        key,
        value: obj,
        type,
        depth: currentDepth,
        expanded: isExpanded,
        path: currentPath
      });
    }
    
    // If object or array and expanded, add child nodes
    if (isObject && (currentPath === '' || isExpanded)) {
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        const value = (obj as Record<string, unknown>)[key];
        const childPath = currentPath ? `${currentPath}.${key}` : key;
        const childNodes = buildNodes(value, childPath, currentDepth + 1);
        nodes.push(...childNodes);
      }
    }
    
    return nodes;
  }, [expandedPaths, initialExpanded, maxDepth]);
  
  // Filter nodes based on path
  const filterNodes = useCallback((nodes: FormattedNode[], filterText: string): FormattedNode[] => {
    if (!filterText) return nodes;
    
    // Convert filter to lowercase for case-insensitive matching
    const lowerFilter = filterText.toLowerCase();
    
    // Keep nodes that match the filter by path or value
    return nodes.filter(node => {
      // Check if path contains filter
      if (node.path.toLowerCase().includes(lowerFilter)) {
        return true;
      }
      
      // Check if string value contains filter
      if (typeof node.value === 'string' && 
          node.value.toLowerCase().includes(lowerFilter)) {
        return true;
      }
      
      // Check if number/boolean value matches filter
      if ((typeof node.value === 'number' || typeof node.value === 'boolean') && 
          String(node.value).toLowerCase().includes(lowerFilter)) {
        return true;
      }
      
      return false;
    });
  }, []);
  
  // Toggle node expansion
  const toggleNode = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
        newSet.add(`!${path}`); // Mark as explicitly collapsed
      } else {
        newSet.add(path);
        newSet.delete(`!${path}`);
      }
      return newSet;
    });
  }, []);
  
  // Expand all nodes
  const expandAll = useCallback(() => {
    const paths = collectAllPaths(data);
    setExpandedPaths(new Set(paths));
  }, [data, collectAllPaths]);
  
  // Collapse all nodes
  const collapseAll = useCallback(() => {
    const paths = collectAllPaths(data);
    const collapsedPaths = new Set(paths.map(path => `!${path}`));
    setExpandedPaths(collapsedPaths);
  }, [data, collectAllPaths]);
  
  // Build and filter nodes
  const allNodes = useMemo(() => {
    const nodes = buildNodes(data);
    return filterNodes(nodes, filter);
  }, [data, buildNodes, filterNodes, filter]);
  
  // Format value based on type
  const formatValue = (node: FormattedNode) => {
    const { value, type, expanded } = node;
    
    if (value === null) return <span className="text-gray-400">null</span>;
    if (value === undefined) return <span className="text-gray-400">undefined</span>;
    
    switch (type) {
      case 'string':
        return <span className="text-green-400">&ldquo;{value as string}&rdquo;</span>;
      case 'number':
        return <span className="text-blue-400">{value as number}</span>;
      case 'boolean':
        return <span className="text-purple-400">{String(value)}</span>;
      case 'object':
        return expanded ? '' : <span className="text-gray-400">{'{ ... }'}</span>;
      case 'array':
        return expanded ? '' : (
          <span className="text-gray-400">
            {'['}
            {(value as unknown[]).length > 0 ? ` ${(value as unknown[]).length} items ` : ''}
            {']'}
          </span>
        );
      default:
        return <span>{String(value)}</span>;
    }
  };
  
  // No data
  if (!data) {
    return <div className="text-gray-400">No data</div>;
  }
  
  return (
    <div className={`font-mono text-sm ${className}`}>
      <div className="mb-2 flex justify-between">
        <div className="text-xs text-gray-400">
          {allNodes.length} {allNodes.length === 1 ? 'item' : 'items'}
        </div>
        <div className="space-x-2">
          <button
            onClick={expandAll}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Collapse All
          </button>
        </div>
      </div>
      
      <div className="bg-slate-800 p-3 rounded overflow-auto">
        {/* Root object */}
        <div className="pb-1">
          {Array.isArray(data) ? '[' : '{'}
        </div>
        
        {/* Nodes */}
        {allNodes.map((node, index) => (
          <div 
            key={`${node.path}-${index}`}
            className="flex items-start"
            style={{ marginLeft: `${node.depth * 16}px` }}
          >
            {/* Expandable toggle for objects/arrays */}
            {(node.type === 'object' || node.type === 'array') && node.value !== null ? (
              <button
                onClick={() => toggleNode(node.path)}
                className="mr-1 text-gray-400 hover:text-white focus:outline-none"
              >
                {node.expanded ? '▼' : '►'}
              </button>
            ) : (
              <span className="mr-1 w-3.5"></span> // Spacer
            )}
            
            {/* Key */}
            <span className="text-yellow-300 pr-1">
              {typeof node.key === 'string' ? `"${node.key}"` : node.key}
              {': '}
            </span>
            
            {/* Value */}
            {formatValue(node)}
            
            {/* Comma for all but last item */}
            {index < allNodes.length - 1 && <span>,</span>}
          </div>
        ))}
        
        {/* Close root object */}
        <div className="pt-1">
          {Array.isArray(data) ? ']' : '}'}
        </div>
      </div>
    </div>
  );
}