<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
defineProps<{ title: string; message: string; confirmLabel: string; danger?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLDialogElement>()
let opener: HTMLElement | null = null
onMounted(() => {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value?.showModal()
})
function finish(action: 'confirm' | 'cancel') {
  dialog.value?.close()
  if (action === 'cancel') {
    if (opener?.isConnected) opener.focus()
    emit('cancel')
  } else emit('confirm')
}
onBeforeUnmount(() => dialog.value?.close())
</script>
<template>
  <dialog ref="dialog" class="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-message" @cancel.prevent="finish('cancel')">
    <h2 id="confirm-title">{{ title }}</h2><p id="confirm-message">{{ message }}</p>
    <div class="dialog-actions"><button autofocus class="button secondary" @click="finish('cancel')">Keep working</button><button class="button" :class="{ danger }" @click="finish('confirm')">{{ confirmLabel }}</button></div>
  </dialog>
</template>
