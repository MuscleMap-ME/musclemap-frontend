/**
 * Layout Components - Box-and-Glue System
 *
 * Layout primitives inspired by Donald Knuth's TeX box-and-glue model.
 * These components provide consistent, predictable layouts while
 * supporting responsive design and RTL languages.
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * import { Stack, Cluster, Grid, Container, Split, Sidebar } from '@/components/layout';
 *
 * // Vertical stack with consistent spacing
 * <Stack space="lg">
 *   <Card>...</Card>
 *   <Card>...</Card>
 * </Stack>
 *
 * // Horizontal wrapping cluster
 * <Cluster space="sm" justify="between">
 *   <Tag>Tag 1</Tag>
 *   <Tag>Tag 2</Tag>
 * </Cluster>
 *
 * // Responsive grid
 * <Grid columns="auto" minWidth="md" gap="lg">
 *   <Card>...</Card>
 *   <Card>...</Card>
 * </Grid>
 */

// Stack - Vertical rhythm layout
export { Stack, default as StackComponent } from './Stack';
export type { StackProps, StackSpace, StackAlign } from './Stack';

// Cluster - Horizontal wrapping layout
export { Cluster, default as ClusterComponent } from './Cluster';
export type { ClusterProps, ClusterSpace, ClusterJustify, ClusterAlign } from './Cluster';

// Grid - Responsive grid layout
export { Grid, GridItem } from './Grid';
export type { GridProps, GridItemProps, GridMinWidth, GridColumns, GridGap } from './Grid';

// Container - Width-constrained layout
export { Container, default as ContainerComponent } from './Container';
export type { ContainerProps, ContainerSize, ContainerPadding } from './Container';

// Split - Two-item separated layout
export { Split, default as SplitComponent } from './Split';
export type { SplitProps, SplitGap, SplitAlign } from './Split';

// Sidebar - Content with sidebar layout
export { Sidebar, SidebarContent, SidebarPanel } from './Sidebar';
export type {
  SidebarProps,
  SidebarContentProps,
  SidebarPanelProps,
  SidebarWidth,
  SidebarPosition,
  SidebarGap,
} from './Sidebar';
