/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as LogsImport } from './routes/logs'
import { Route as IndexImport } from './routes/index'

// Create/Update Routes

const LogsRoute = LogsImport.update({
  id: '/logs',
  path: '/logs',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/logs': {
      id: '/logs'
      path: '/logs'
      fullPath: '/logs'
      preLoaderRoute: typeof LogsImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/logs': typeof LogsRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/logs': typeof LogsRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/logs': typeof LogsRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/logs'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/logs'
  id: '__root__' | '/' | '/logs'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  LogsRoute: typeof LogsRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  LogsRoute: LogsRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/logs"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/logs": {
      "filePath": "logs.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
