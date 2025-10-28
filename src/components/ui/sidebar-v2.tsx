// Inspired by https://github.com/dillionverma/llm-rag-with-langchain-and-nextjs/blob/main/components/sidebar.tsx
'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronLeft } from 'lucide-react'

const sidebarVariants = cva('flex flex-col', {
  variants: {
    variant: {
      default: 'bg-card text-card-foreground',
      transparent: 'bg-transparent',
    },
  },
  defaultVariants: {
    variant: 'default',
  }
})


interface SidebarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof sidebarVariants> {}


const SidebarContext = React.createContext<{
  isCollapsed: boolean,
  open: boolean,
  setOpen: (open: boolean) => void,
  toggleCollapsed: () => void,
}>({
  isCollapsed: false,
  open: false,
  setOpen: () => { },
  toggleCollapsed: () => { },
})


export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}


export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  // Effect to handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setOpen(false); // Close mobile sheet on desktop
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const value = {
    isCollapsed,
    open,
    setOpen,
    toggleCollapsed: () => setIsCollapsed(prev => !prev),
  }

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(({
  className,
  variant,
  ...props
}, ref) => {
  const { isCollapsed, toggleCollapsed } = useSidebar()
  return (
    <div
      ref={ref}
      className={cn(
        'relative',
        isCollapsed ? 'w-14' : 'w-64',
        'transition-all duration-300 ease-in-out',
        'hidden md:block'
      )}
    >
      <div
        className={cn(
          sidebarVariants({ variant }),
          "fixed h-full border-r",
          isCollapsed ? 'w-14' : 'w-64',
          'transition-all duration-300 ease-in-out',
          className
        )}
        {...props}
      />
      <Button
        variant="outline"
        size="icon"
        className={cn(
          'absolute -right-5 top-1/2 -translate-y-1/2 rounded-full z-10 hidden md:flex',
          'transition-transform duration-300 ease-in-out',
          isCollapsed ? 'rotate-180' : 'rotate-0'
        )}
        onClick={toggleCollapsed}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  )
})
Sidebar.displayName = 'Sidebar'


const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className,
  ...props
}, ref) => {
  const { isCollapsed } = useSidebar()
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center p-4',
        isCollapsed ? 'justify-center' : '',
        className
      )}
      {...props}
    />
  )
})
SidebarHeader.displayName = 'SidebarHeader'


const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex-1 overflow-y-auto overflow-x-hidden p-2',
      className
    )}
    {...props}
  />
))
SidebarContent.displayName = 'SidebarContent'

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className,
  ...props
}, ref) => {
  const { isCollapsed } = useSidebar()
  return (
    <div
      ref={ref}
      className={cn(
        'p-4 mt-auto border-t',
        isCollapsed ? 'p-2' : 'p-4',
        className
      )}
      {...props}
    />
  )
})
SidebarFooter.displayName = 'SidebarFooter'

const SidebarSection = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  title?: string
}>(({
  className,
  title,
  children,
  ...props
}, ref) => {
  const { isCollapsed } = useSidebar()
  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-1',
        className
      )}
      {...props}
    >
      {title && (
        <h3 className={cn(
          'text-xs text-muted-foreground font-medium',
          isCollapsed ? 'text-center' : 'px-4'
        )}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
})
SidebarSection.displayName = 'SidebarSection'


const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(({
  className,
  ...props
}, ref) => (
  <ul
    ref={ref}
    className={cn(
      'flex flex-col gap-1',
      className
    )}
    {...props}
  />
))
SidebarMenu.displayName = 'SidebarMenu'


const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(({
  className,
  ...props
}, ref) => (
  <li
    ref={ref}
    className={cn(
      'relative',
      className
    )}
    {...props}
  />
))
SidebarMenuItem.displayName = 'SidebarMenuItem'

interface SidebarMenuButtonProps extends ButtonProps {
  icon?: React.ReactNode,
  isActive?: boolean
}


const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(({
  className,
  icon,
  isActive,
  children,
  ...props
}, ref) => {
  const { isCollapsed } = useSidebar()
  const button = (
    <Button
      ref={ref}
      variant={isActive ? 'secondary' : 'ghost'}
      className={cn(
        'w-full flex items-center gap-3',
        isCollapsed ? 'justify-center' : 'justify-start',
        className
      )}
      {...props}
    >
      {icon && React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4' })}
      <span className={cn(isCollapsed ? 'hidden' : 'block')}>
        {children}
      </span>
    </Button>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent side="right">
          {children}
        </TooltipContent>
      </Tooltip>
    )
  }

  return button
})
SidebarMenuButton.displayName = 'SidebarMenuButton'


const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex-1 flex flex-col',
        className
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = 'SidebarInset'


export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarSection,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
}
