import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: '',
    title: 'Dashboard',
    loadComponent: async () => (await import('./dashboard.component')).DashboardComponent,
  },
];
