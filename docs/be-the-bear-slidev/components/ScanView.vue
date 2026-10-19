<script setup>
defineProps({ src: { type: String, default: '' }, adopted: { type: Boolean, default: false } })
</script>
<template>
  <div class="scan-view">
    <img v-if="src" :src="src" alt="実際の身体スキャン画面" class="scan-image" />
    <template v-else>
      <svg viewBox="0 0 300 330" class="scan-svg" role="img" :aria-label="adopted ? '基準姿勢の取得を説明する身体スキャンの模式図' : '身体スキャンの仮画像。実際の認識映像ではありません。'">
        <defs><linearGradient id="scan-bg" x2="0" y2="1"><stop stop-color="#163c50"/><stop offset="1" stop-color="#0b2232"/></linearGradient></defs>
        <rect width="300" height="330" fill="url(#scan-bg)" />
        <path d="M0 280H300M45 0V330M255 0V330" stroke="#335365" stroke-width="1" opacity=".5" />
        <ellipse cx="150" cy="288" rx="60" ry="9" fill="#06151f" opacity=".7" />
        <g fill="#718593" opacity=".55"><circle cx="150" cy="72" r="22"/><path d="M132 100Q150 91 168 100L178 175L193 275H169L150 198L131 275H107L122 175Z"/><path d="M132 103L96 158L76 188L89 198L124 160L140 127M168 103L204 158L224 188L211 198L176 160L160 127" /></g>
        <g fill="none" stroke="#6ce8d6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M132 112H168L171 180H129Z M132 112L108 151L83 191M168 112L192 151L217 191M129 180L121 227L117 274M171 180L179 227L183 274" />
        </g>
        <g fill="#c2fff0"><circle cx="132" cy="112" r="4"/><circle cx="168" cy="112" r="4"/><circle cx="129" cy="180" r="4"/><circle cx="171" cy="180" r="4"/><circle cx="108" cy="151" r="4"/><circle cx="192" cy="151" r="4"/><circle cx="83" cy="191" r="4"/><circle cx="217" cy="191" r="4"/><circle cx="121" cy="227" r="4"/><circle cx="179" cy="227" r="4"/><circle cx="117" cy="274" r="4"/><circle cx="183" cy="274" r="4"/></g>
        <path d="M60 65V42H89M211 42H240V65M60 269V295H89M211 295H240V269" fill="none" stroke="#70e9d8" stroke-width="2" />
        <path d="M61 151H239" stroke="#70e9d8" opacity=".3" />
        <rect x="18" y="13" width="116" height="23" rx="4" :fill="adopted ? '#70e9d8' : '#edb54c'" />
        <text x="76" y="29" text-anchor="middle" fill="#122d40" font-size="12" font-weight="700">{{ adopted ? '基準姿勢の取得' : '仮画像・差し替え用' }}</text>
        <text x="150" y="319" text-anchor="middle" fill="#c4e9eb" font-size="12">全身を映して、姿勢を合わせる</text>
      </svg>
    </template>
  </div>
</template>
