<script setup lang="ts">
import { computed } from 'vue'
import { X, Clock3, Trash2, ArrowRight, CalendarPlus } from 'lucide-vue-next'
import { useBookingsStore } from '../stores/bookings'
import { hasStarted, localDate, timeOptions, toMinutes } from '../utils/time'
import { availableStarts, availableEnds } from '../utils/availability'
const props = defineProps<{ now: Date }>()
defineEmits<{ close: []; delete: [] }>()
const store = useBookingsStore()
const duration = computed(() => store.draft ? toMinutes(store.draft.end) - toMinutes(store.draft.start) : 0)
const locked = computed(() => {
  return !!store.editingId && !!store.draft && hasStarted(store.draft.date, store.originalStart, props.now)
})
const starts = computed(() => availableStarts(store.draft?.date ?? store.selectedDate, store.bookings, store.editingId, props.now))
const ends = computed(() => availableEnds(store.draft?.date ?? store.selectedDate, store.draft?.start ?? '', store.bookings, store.editingId, props.now))
const canCreate = computed(() => availableStarts(store.selectedDate, store.bookings, undefined, props.now).length > 0)
</script>
<template>
  <div class="form-content">
    <template v-if="store.draft">
      <div class="form-heading"><div><span class="eyebrow">{{ store.editingId ? 'YOUR RESERVATION' : 'PLAN YOUR NEXT MEETING' }}</span><h2 id="form-title">{{ store.editingId ? 'Edit booking' : 'Book the room' }}</h2></div><button class="icon-button" aria-label="Close booking form" :disabled="store.submitting" @click="$emit('close')"><X :size="19" /></button></div>
      <p class="form-intro">A space for your next big conversation.</p>
      <form novalidate @submit.prevent="store.saveBooking()">
        <fieldset :disabled="store.submitting || locked">
          <label for="booking-date">Booking date</label><input id="booking-date" type="date" :value="store.draft.date" :min="localDate(now)" :readonly="!!store.editingId" @change="store.changeDraftDate(($event.target as HTMLInputElement).value)" /><p v-if="!starts.length && !locked" class="feedback" role="status">No valid intervals remain. Choose a future date.</p>
          <label for="title">Meeting title <span class="optional">optional</span></label>
          <input id="title" v-model="store.draft.title" @input="delete store.validationErrors.title" placeholder="e.g. Team catch-up" maxlength="120" :aria-invalid="!!store.validationErrors.title" aria-describedby="title-error" />
          <p v-if="store.validationErrors.title" id="title-error" class="field-error">{{ store.validationErrors.title }}</p>
          <div class="time-fields"><div><label for="start">Start time</label><select id="start" :value="store.draft.start" @change="store.changeStart(($event.target as HTMLSelectElement).value)" :aria-invalid="!!store.validationErrors.start" aria-describedby="start-error"><option v-if="!timeOptions.includes(store.draft.start)" :value="store.draft.start" disabled>{{ store.draft.start || 'No available times' }}</option><option v-for="time in timeOptions" :key="time" :disabled="!starts.includes(time)">{{ time }}</option></select><p v-if="store.validationErrors.start" id="start-error" class="field-error">{{ store.validationErrors.start }}</p></div>
          <div><label for="end">End time</label><select id="end" v-model="store.draft.end" @change="delete store.validationErrors.end; delete store.validationErrors.overlap; store.formError = ''" :aria-invalid="!!store.validationErrors.end" aria-describedby="end-error"><option v-if="!ends.includes(store.draft.end)" :value="store.draft.end" disabled>{{ store.draft.end || 'No available times' }}</option><option v-for="time in ends" :key="time">{{ time }}</option></select><p v-if="store.validationErrors.end" id="end-error" class="field-error">{{ store.validationErrors.end }}</p></div></div>
          <div class="duration"><Clock3 :size="16" /> {{ duration > 0 ? `${duration} minute meeting` : 'Choose your meeting times' }}</div>
          <p v-if="store.validationErrors.date" class="field-error">{{ store.validationErrors.date }}</p>
          <p v-if="store.validationErrors.overlap" class="feedback error" role="alert">{{ store.validationErrors.overlap }}</p>
          <button v-if="!locked" class="button submit" :disabled="!starts.length || store.loading || !!store.error" type="submit">{{ store.submitting ? 'Saving…' : store.editingId ? 'Save changes' : 'Create booking' }}<ArrowRight :size="17" /></button>
          <button v-if="store.editingId && !locked" class="delete-button" type="button" @click="$emit('delete')"><Trash2 :size="15" /> Delete booking</button>
        </fieldset>
        <p v-if="locked" class="feedback error" role="alert">This booking has started and can no longer be changed.</p>
        <p v-if="store.formError" class="feedback error" role="alert">{{ store.formError }}</p>
      </form>
      <div class="form-guidance"><h3>A few things to know</h3><p>Meetings can be 30 minutes to 2 hours.<br>Choose any available time, 09:00–18:00.<br>Back-to-back meetings are welcome.</p></div>
    </template>
    <div v-else class="form-empty"><CalendarPlus :size="32" /><h2>Space for your plans</h2><p>Select a booking to make changes, or start a new conversation.</p><p v-if="!canCreate">No valid intervals remain. Select a future date.</p><button class="button" :disabled="!canCreate" @click="store.openCreateForm()">New booking <ArrowRight :size="16" /></button></div>
  </div>
</template>
