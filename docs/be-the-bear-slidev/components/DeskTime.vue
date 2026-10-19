<template>
  <div class="desk-time" role="img" aria-label="PCに向かって座る人と、針が回って時間の経過を示す時計">
    <PoseFigure mode="desk" />
    <svg class="time-clock" viewBox="0 0 150 150" aria-hidden="true">
      <path d="M25 45A61 61 0 0 1 117 25M122 110A61 61 0 0 1 33 128" fill="none" stroke="#89b9c7" stroke-width="4" stroke-linecap="round" />
      <path d="M106 24L119 25L117 12M44 129L31 127L33 140" fill="none" stroke="#89b9c7" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="75" cy="75" r="46" fill="#f5fafc" stroke="#007fa5" stroke-width="5" />
      <path d="M75 37V43M113 75H107M75 113V107M37 75H43" stroke="#89b9c7" stroke-width="3" stroke-linecap="round" />
      <path d="M75 75L54 55M75 75L49 83" fill="none" stroke="#18b6c8" stroke-width="4" opacity=".22" stroke-linecap="round" />
      <path d="M75 75L92 57M75 75L65 98" fill="none" stroke="#18b6c8" stroke-width="4" opacity=".4" stroke-linecap="round" />
      <path d="M75 75L65 59" stroke="#123146" stroke-width="5" stroke-linecap="round" />
      <path class="clock-minute" d="M75 75L101 87" stroke="#007fa5" stroke-width="5" stroke-linecap="round" />
      <circle cx="75" cy="75" r="5" fill="#007fa5" />
    </svg>
  </div>
</template>
