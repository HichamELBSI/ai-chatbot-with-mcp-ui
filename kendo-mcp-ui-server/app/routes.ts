import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('kendotable', 'routes/kendotable.tsx'),
  route('kendocard', 'routes/kendocard.tsx'),
] satisfies RouteConfig;
