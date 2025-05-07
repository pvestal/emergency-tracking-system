import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import { useAuthStore } from '@/stores/auth'
import { useUserProfileStore } from '@/stores/userProfile'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresGuest: true }
  },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tracking',
    name: 'tracking',
    component: () => import(/* webpackChunkName: "tracking" */ '../views/LocationTrackingView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/identification',
    name: 'identification',
    component: () => import(/* webpackChunkName: "identification" */ '../views/StaffIdentificationView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/users',
    name: 'users',
    component: () => import(/* webpackChunkName: "users" */ '../views/UsersView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/analytics',
    name: 'analytics',
    component: () => import(/* webpackChunkName: "analytics" */ '../views/AnalyticsView.vue'),
    meta: { requiresAuth: true, requiresAnalyticsAccess: true }
  },
  {
    path: '/integrations',
    name: 'integrations',
    component: () => import(/* webpackChunkName: "integrations" */ '../views/IntegrationsView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)
  const requiresAnalyticsAccess = to.matched.some(record => record.meta.requiresAnalyticsAccess)

  // Wait for auth state to be determined
  const unsubscribe = setInterval(() => {
    // Auth state not yet determined, keep waiting
    if (authStore.loading) return

    clearInterval(unsubscribe)
    
    if (requiresAuth && !authStore.isAuthenticated) {
      // User is not authenticated but route requires auth
      next({ name: 'login' })
    } else if (requiresGuest && authStore.isAuthenticated) {
      // User is authenticated but route is for guests only
      next({ name: 'home' })
    } else if (requiresAdmin || requiresAnalyticsAccess) {
      // Check for user role-based permissions
      const userProfileStore = useUserProfileStore()
      
      // If profile is still loading, wait
      if (userProfileStore.loading) {
        const profileUnsubscribe = setInterval(() => {
          if (userProfileStore.loading) return
          
          clearInterval(profileUnsubscribe)
          
          if (requiresAdmin && !userProfileStore.canManageUsers) {
            // User doesn't have admin privileges
            next({ name: 'home' })
          } else if (requiresAnalyticsAccess && !userProfileStore.canViewAnalytics) {
            // User doesn't have analytics access
            next({ name: 'home' })
          } else {
            // User has appropriate privileges, proceed
            next()
          }
        }, 100)
      } else if (requiresAdmin && !userProfileStore.canManageUsers) {
        // User doesn't have admin privileges
        next({ name: 'home' })
      } else if (requiresAnalyticsAccess && !userProfileStore.canViewAnalytics) {
        // User doesn't have analytics access
        next({ name: 'home' })
      } else {
        // User has appropriate privileges, proceed
        next()
      }
    } else {
      // Proceed as normal
      next()
    }
  }, 100)
})

export default router
