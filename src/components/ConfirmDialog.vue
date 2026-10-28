<script setup lang="ts">
import { onMounted, ref } from 'vue'
defineProps<{ title: string; message: string; confirmLabel: string; danger?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLDialogElement>()
onMounted(() => dialog.value?.showModal())
</script>
<template>
  <dialog ref="dialog" class="confirm-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-message" @cancel.prevent="emit('cancel')">
    <h2 id="confirm-title">{{ title }}</h2><p id="confirm-message">{{ message }}</p>
    <div class="dialog-actions"><button autofocus class="button secondary" @click="emit('cancel')">Keep working</button><button class="button" :class="{ danger }" @click="emit('confirm')">{{ confirmLabel }}</button></div>
  </dialog>
</template>
