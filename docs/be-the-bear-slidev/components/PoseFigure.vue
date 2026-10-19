<script setup>
defineProps({ mode: { type: String, default: 'stand' }, color: { type: String, default: '#1399b0' } })
</script>
<template>
  <svg viewBox="0 0 180 210" class="pose-figure" aria-hidden="true">
    <ellipse cx="90" cy="191" rx="48" ry="6" fill="currentColor" opacity=".08" />
    <path d="M28 191H152" stroke="currentColor" stroke-width="2" opacity=".18" />
    <g :stroke="color" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <template v-if="mode === 'desk'">
        <circle cx="60" cy="46" r="15" :fill="color" stroke="none" />
        <path d="M60 73V124H102V178M61 85L87 106H116" />
        <path d="M28 91V137H72M37 137V181M94 119H169M151 119V181" stroke="#6f8594" stroke-width="5" />
        <path d="M120 106L114 74H156L161 106Z" stroke-width="4" />
      </template>
      <template v-else-if="mode === 'sit'">
        <circle cx="77" cy="46" r="15" :fill="color" stroke="none" />
        <path d="M77 73V124H120V178M78 84L104 101L131 88" />
        <path d="M44 91V137H88M53 137V181" stroke="#6f8594" stroke-width="5" />
        <path d="M128 71L137 92" stroke="#e9ad48" stroke-width="7" />
      </template>
      <template v-else-if="mode === 'tuck'">
        <circle cx="112" cy="71" r="15" :fill="color" stroke="none" />
        <path d="M99 96L72 126L111 145L82 181M98 99L131 128L151 116M72 126L56 152L63 181" />
      </template>
      <template v-else-if="mode === 'foot'">
        <circle cx="90" cy="34" r="15" :fill="color" stroke="none" />
        <path d="M90 60V119M90 75L52 103M90 75L128 103M90 119L71 183M90 119L122 139L147 125" />
      </template>
      <template v-else-if="mode === 'jump'">
        <circle cx="90" cy="26" r="15" :fill="color" stroke="none" />
        <path d="M90 52V112M90 66L53 36M90 66L127 36M90 112L62 148M90 112L118 148" />
        <path d="M34 154V119M146 154V119" stroke-width="3" opacity=".5" />
        <path d="M28 126L34 119L40 126M140 126L146 119L152 126" stroke-width="3" />
      </template>
      <template v-else-if="mode === 'lean'">
        <circle cx="65" cy="36" r="15" :fill="color" stroke="none" />
        <path d="M70 63L91 119M75 78L40 111M75 78L121 85M91 119L67 183M91 119L123 183" />
      </template>
      <template v-else>
        <circle cx="90" cy="34" r="15" :fill="color" stroke="none" />
        <path d="M90 60V119M90 75L52 103M90 75L128 103M90 119L66 183M90 119L114 183" />
      </template>
    </g>
  </svg>
</template>
