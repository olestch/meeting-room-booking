<script setup lang="ts">
import { computed } from 'vue'
import { X, Clock3, Trash2, ArrowRight, CalendarPlus } from 'lucide-vue-next'
import { useBookingsStore } from '../stores/bookings'
import { hasStarted, timeOptions, toMinutes } from '../utils/time'
const props = defineProps<{ now: Date }>()
defineEmits<{ close: []; delete: [] }>()
const store = useBookingsStore()
const duration = computed(() => store.draft ? toMinutes(store.draft.end) - toMinutes(store.draft.start) : 0)
const locked = computed(() => {
  const original = store.bookings.find(b => b.id === store.editingId)
  return !!original && hasStarted(original.date, original.start, props.now)
})
</script>
<template>
  <div class="form-content">
    <template v-if="store.draft">
      <div class="form-heading"><div><span class="eyebrow">{{ store.editingId ? 'YOUR RESERVATION' : 'PLAN YOUR NEXT MEETING' }}</span><h2 id="form-title">{{ store.editingId ? 'Edit booking' : 'Book the room' }}</h2></div><button class="icon-button" aria-label="Close booking form" :disabled="store.submitting" @click="$emit('close')"><X :size="19" /></button></div>
      <p class="form-intro">A space for your next big conversation.</p>
      <form novalidate @submit.prevent="store.saveBooking()">
        <fieldset :disabled="store.submitting || locked">
          <label for="title">Meeting title <span class="optional">optional</span></label>
          <input id="title" v-model="store.draft.title" placeholder="e.g. Team catch-up" maxlength="120" :aria-invalid="!!store.validationErrors.title" aria-describedby="title-error" />
          <p v-if="store.validationErrors.title" id="title-error" class="field-error">{{ store.validationErrors.title }}</p>
          <div class="time-fields"><div><label for="start">Start time</label><select id="start" v-model="store.draft.start" :aria-invalid="!!store.validationErrors.start" aria-describedby="start-error"><option v-for="time in timeOptions" :key="time">{{ time }}</option></select><p v-if="store.validationErrors.start" id="start-error" class="field-error">{{ store.validationErrors.start }}</p></div>
          <div><label for="end">End time</label><select id="end" v-model="store.draft.end" :aria-invalid="!!store.validationErrors.end" aria-describedby="end-error"><option v-for="time in timeOptions" :key="time">{{ time }}</option></select><p v-if="store.validationErrors.end" id="end-error" class="field-error">{{ store.validationErrors.end }}</p></div></div>
          <div class="duration"><Clock3 :size="16" /> {{ duration > 0 ? `${duration} minute meeting` : 'Choose your meeting times' }}</div>
          <p v-if="store.validationErrors.date" class="field-error">{{ store.validationErrors.date }}</p>
          <p v-if="store.validationErrors.overlap" class="feedback error" role="alert">{{ store.validationErrors.overlap }}</p>
          <button class="button submit" type="submit">{{ store.submitting ? 'Saving…' : store.editingId ? 'Save changes' : 'Create booking' }}<ArrowRight :size="17" /></button>
          <button v-if="store.editingId" class="delete-button" type="button" @click="$emit('delete')"><Trash2 :size="15" /> Delete booking</button>
        </fieldset>
        <p v-if="locked" class="feedback error" role="alert">This booking has started and can no longer be changed.</p>
        <p v-if="store.formError" class="feedback error" role="alert">{{ store.formError }}</p>
      </form>
      <div class="form-guidance"><h3>A few things to know</h3><p>Meetings can be 30 minutes to 2 hours.<br>Choose any available time, 09:00–18:00.<br>Back-to-back meetings are welcome.</p></div>
    </template>
    <div v-else class="form-empty"><CalendarPlus :size="32" /><h2>Space for your plans</h2><p>Select a booking to make changes, or start a new conversation.</p><button class="button" @click="store.openCreateForm()">New booking <ArrowRight :size="16" /></button></div>
  </div>
</template>
