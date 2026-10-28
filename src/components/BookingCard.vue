<script setup lang="ts">
import { computed } from 'vue'
import { LockKeyhole } from 'lucide-vue-next'
import type { Booking } from '../types/booking'
import { hasStarted, toMinutes } from '../utils/time'
const props = defineProps<{ booking: Booking; now: Date }>()
defineEmits<{ select: [booking: Booking] }>()
const past = computed(() => hasStarted(props.booking.date, props.booking.start, props.now))
const position = computed(() => ({ top: `${(toMinutes(props.booking.start) - 540) * 1.6}px`, height: `${(toMinutes(props.booking.end) - toMinutes(props.booking.start)) * 1.6}px` }))
</script>
<template>
  <button class="booking-card" :class="{ past }" :style="position" :disabled="past" :aria-label="`${booking.title || 'Untitled meeting'}, ${booking.start}–${booking.end}${past ? ', read only' : ', edit booking'}`" @click="$emit('select', booking)">
    <span class="booking-title">{{ booking.title || 'Untitled meeting' }}</span><span class="booking-time">{{ booking.start }} – {{ booking.end }} <LockKeyhole v-if="past" :size="11" /></span>
  </button>
</template>
