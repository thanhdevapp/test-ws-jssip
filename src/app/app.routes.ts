import { Routes } from '@angular/router';

export const ROUTES_NAME_DASHBOARD = {
  DASHBOARD: `/dashboard`
}


export const routes: Routes = [
  {
    path: '',
    redirectTo: ROUTES_NAME_DASHBOARD.DASHBOARD,
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    data: { breadcrumb: 'Dashboard' },
    // canMatch: [checkLoadMFE() ? AuthGuard : AuthKeycloakGuard],
    loadChildren: async () => (await import('./dashboard/dashboard.routes')).routes
  },
  {
    path: 'jssip',
    data: { breadcrumb: 'jssip' },
    // canMatch: [checkLoadMFE() ? AuthGuard : AuthKeycloakGuard],
    loadChildren: async () => (await import('./websocket-sip/dashboard.routes')).routes
  }
]
