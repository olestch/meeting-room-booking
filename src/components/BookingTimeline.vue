<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import { CalendarDays, RefreshCw } from 'lucide-vue-next'
import { useBookingsStore } from '../stores/bookings'
import { localDate } from '../utils/time'
import BookingCard from './BookingCard.vue'
import type { Booking } from '../types/booking'
const props = defineProps<{ now: Date }>()
defineEmits<{ select: [booking: Booking] }>()
const store = useBookingsStore()
const pastMinutes = computed(() => store.selectedDate < localDate(props.now) ? 540 : store.selectedDate > localDate(props.now) ? 0 : Math.max(0, Math.min(540, props.now.getHours() * 60 + props.now.getMinutes() - 540)))
watch(() => [store.pendingScroll, store.loading, store.selectedDate], async () => {
  const pending = store.pendingScroll
  if (!pending || pending.date !== store.selectedDate || !store.availabilityReady) return
  await nextTick()
  if (store.pendingScroll !== pending || store.selectedDate !== pending.date || !store.availabilityReady) return
  const card = document.getElementById('booking-' + pending.id)
  if (card) card.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' })
  store.pendingScroll = undefined
})
</script>
<template>
  <section class="timeline-panel" aria-label="Daily booking timeline" :aria-busy="store.loading">
    <div class="timeline-heading"><div><span class="eyebrow">DAILY SCHEDULE</span><h2>Make room for good ideas.</h2></div><span class="booking-count">{{ store.bookings.length }} bookings</span></div>
    <div v-if="store.error" class="feedback error" role="alert">{{ store.error }} Previously loaded bookings may be outdated. Availability is unavailable until retry succeeds. <button class="text-button" @click="store.fetchBookings()"><RefreshCw :size="14" /> Retry</button></div>
    <p v-else-if="store.loading" class="schedule-message" role="status">Loading the room’s schedule…</p>
    <p v-else-if="store.availabilityReady && !store.bookings.length" class="schedule-message"><CalendarDays :size="16" /> A little space to think. No bookings for this day.</p>
    <div class="timeline-scroll"><div class="timeline">
      <div v-for="hour in 10" :key="hour" class="hour-label" :style="{ top: `${(hour - 1) * 96}px` }">{{ String(hour + 8).padStart(2, '0') }}:00</div>
      <div class="timeline-grid"><div class="past-shade" :style="{ height: `${pastMinutes * 1.6}px` }" />
        <BookingCard v-for="booking in store.sortedBookings" :key="booking.id" :booking="booking" :now="now" @select="$emit('select', $event)" />
        <div v-if="pastMinutes > 0 && pastMinutes < 540" class="now-line" :style="{ top: `${pastMinutes * 1.6}px` }"><span /> <b>{{ now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) }}</b></div>
      </div>
    </div></div>
    <div class="timeline-footer"><span><i class="legend occupied" /> Booked</span><span><i class="legend" /> Available</span><span><i class="legend elapsed" /> Past</span><span class="local-time">All times are local</span></div>
  </section>
</template>
