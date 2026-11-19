import { Redirect } from 'expo-router';

/**
 * Allocation is now the app's home screen. Keep this route so older links and
 * bookmarks land on the same allocation-first experience.
 */
export default function AllocationRedirect() {
  return <Redirect href="/" />;
}
