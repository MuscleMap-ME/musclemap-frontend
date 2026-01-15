/**
 * Layout Components
 *
 * Provides consistent page structure and navigation elements.
 *
 * @example
 * import { MainLayout, PageHeader, PageContent } from '@/layouts';
 *
 * function MyPage() {
 *   return (
 *     <MainLayout>
 *       <PageContent>
 *         <PageHeader
 *           title="My Page"
 *           description="This is my page"
 *           actions={<Button>Action</Button>}
 *         />
 *         <div>Content here</div>
 *       </PageContent>
 *     </MainLayout>
 *   );
 * }
 */

export { MainLayout, PageHeader, PageContent, default } from './MainLayout';
