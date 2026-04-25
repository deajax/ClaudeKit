<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    asChild?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'default',
    size: 'default',
    asChild: false
})
</script>

<template>
    <Primitive
        :as="props.as"
        :as-child="props.asChild"
        :class="
            cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                props.variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
                props.variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                props.variant === 'outline' && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                props.variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                props.variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
                props.variant === 'link' && 'text-primary underline-offset-4 hover:underline',
                props.size === 'default' && 'h-10 px-4 py-2',
                props.size === 'sm' && 'h-9 rounded-md px-3',
                props.size === 'lg' && 'h-11 rounded-md px-8',
                props.size === 'icon' && 'h-10 w-10'
            )
        "
    >
        <slot />
    </Primitive>
</template>
