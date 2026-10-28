<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, DoorOpen, Plus, Users, Video, Wifi } from 'lucide-vue-next'
import { useBookingsStore } from './stores/bookings'
import { localDate, validDate } from './utils/time'
import type { Booking } from './types/booking'
import BookingTimeline from './components/BookingTimeline.vue'
import BookingForm from './components/BookingForm.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
const store = useBookingsStore(), now = ref(new Date()), mobile = ref(window.matchMedia('(max-width: 760px)').matches)
const formDialog = ref<HTMLDialogElement>(), pending = ref<(() => void) | null>(null), deleting = ref(false)
import { availableStarts } from './utils/availability'
const modal = computed(() => mobile.value || !!store.editingId)
const canCreate = computed(() => store.availabilityReady && availableStarts(store.selectedDate, store.bookings, undefined, now.value).length > 0)
const dateLabel = computed(() => new Date(`${store.selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
let timer: ReturnType<typeof setInterval>
let returnFocus: HTMLElement | null = null
async function syncDialog() {
  await nextTick()
  if (modal.value && store.draft) { if (!formDialog.value?.open) formDialog.value?.showModal() }
  else { formDialog.value?.close(); if (!store.draft) returnFocus?.focus() }
}
function perform(action: () => void) {
  if (store.submitting) return
  if (store.dirty) pending.value = action
  else action()
}
function open(booking?: Booking) { perform(() => { returnFocus = document.activeElement as HTMLElement; if (booking) store.openEditForm(booking); else store.openCreateForm(); void syncDialog() }) }
function close() { perform(() => { store.closeForm(); formDialog.value?.close(); returnFocus?.focus() }) }
function changeDate(date: string) { if (validDate(date) && date !== store.selectedDate) perform(() => { void store.selectDate(date); formDialog.value?.close() }) }
function moveDate(offset: number) { const date = new Date(`${store.selectedDate}T12:00:00`); date.setDate(date.getDate() + offset); changeDate(localDate(date)) }
function discard() { const action = pending.value; pending.value = null; store.closeForm(); action?.() }
function beforeUnload(event: BeforeUnloadEvent) { if (store.dirty) { event.preventDefault(); event.returnValue = '' } }
function resize() { mobile.value = window.matchMedia('(max-width: 760px)').matches; void syncDialog() }
watch(() => [!!store.draft, modal.value], () => { void syncDialog() })
onMounted(() => { void store.fetchBookings(); timer = setInterval(() => { now.value = new Date() }, 15000); window.addEventListener('beforeunload', beforeUnload); window.addEventListener('resize', resize) })
onBeforeUnmount(() => { clearInterval(timer); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('resize', resize) })
</script>
<template>
  <header class="topbar"><a href="./" class="brand" aria-label="Roomly home"><span class="brand-icon"><DoorOpen :size="22" /></span>roomly<span class="brand-dot">.</span></a><span class="topbar-caption">A little space. A lot of possibility.</span><span class="workspace"><span class="avatar">S</span> Studio workspace</span></header>
  <main>
    <div class="breadcrumb">Workspace <span>/</span> Meeting rooms <span>/</span> <b>The Studio</b></div>
    <section class="room-heading"><div><span class="eyebrow">YOUR SPACE TO CONNECT</span><h1>The Studio<span class="room-status"><i /> Meeting room</span></h1><p>Good conversations start with the right space.</p></div><button class="button new-booking" :disabled="store.submitting || !canCreate" @click="open()"><Plus :size="17" /> New booking</button></section>
    <p v-if="store.availabilityReady && !canCreate" class="schedule-message">No valid intervals remain for this date. Select a future date.</p>
    <div class="room-details"><span><Users :size="16" /> Up to 8 people</span><span><Video :size="16" /> Video conferencing</span><span><Wifi :size="16" /> High-speed Wi-Fi</span><span class="room-location">2nd floor · East wing <ArrowUpRight :size="14" /></span></div>
    <section class="date-toolbar" aria-label="Date navigation"><div class="date-summary"><CalendarDays :size="21" /><div><h2>{{ dateLabel }}</h2><span>{{ store.selectedDate === localDate(now) ? 'Today' : 'Daily view' }} · 09:00–18:00</span></div></div><div class="date-controls"><button class="button secondary today-button" :disabled="store.submitting" @click="changeDate(localDate(now))">Today</button><button class="icon-button" aria-label="Previous day" :disabled="store.submitting" @click="moveDate(-1)"><ChevronLeft :size="19" /></button><label class="sr-only" for="date">Select date</label><input id="date" type="date" :value="store.selectedDate" :disabled="store.submitting" @change="(e) => { const el = e.target as HTMLInputElement; changeDate(el.value); el.value = store.selectedDate }" /><button class="icon-button" aria-label="Next day" :disabled="store.submitting" @click="moveDate(1)"><ChevronRight :size="19" /></button></div></section>
    <p v-if="store.notice" class="feedback success" role="status">{{ store.notice }}</p>
    <div class="booking-layout"><BookingTimeline :now="now" @select="open" /><aside v-if="!modal" class="form-panel" aria-label="Booking form"><BookingForm :now="now" @close="close" @delete="deleting = true" /></aside></div>
    <footer class="page-footer"><span>Thoughtful meetings. Better days.</span><span>One room, endless possibilities.</span></footer>
  </main>
  <dialog ref="formDialog" class="mobile-form" aria-labelledby="form-title" @cancel.prevent="close"><BookingForm v-if="modal" :now="now" @close="close" @delete="deleting = true" /></dialog>
  <ConfirmDialog v-if="pending" title="Discard unsaved changes?" message="Your booking has unsaved changes. Discard them to continue?" confirm-label="Discard changes" danger @cancel="pending = null" @confirm="discard" />
  <ConfirmDialog v-if="deleting" title="Delete this booking?" message="This will free up the room for others. This action cannot be undone." confirm-label="Delete booking" danger @cancel="deleting = false" @confirm="deleting = false; store.deleteBooking().then(syncDialog)" />
</template>
