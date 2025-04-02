import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: '',
    title: 'JSSIP',
    loadComponent: async () => (await import('./dashboard.component')).DashboardComponent,
  },
];
