<!--
  The three figures under the hero (Hars, 15 November 2026), each a link to its
  evidence in Coachboard. An island with client:visible, hydrated 200 px before it
  comes into view. On the server, without JavaScript and with reduced motion, each
  figure is its final value. Hydrated before it can be seen, it goes to 0 and
  counts up once when it comes into view; already in view when it hydrates, it
  stays as it is. Screen readers get the final value only: the counting figure is
  aria-hidden, the value is in the link's text.
-->
<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    items: { value: string; rest: string; was: string; href: string }[];
  }

  let { items }: Props = $props();

  /** How long the counting takes (ms). */
  const DURATION = 1200;

  /** Each value as the number it counts to and what follows it: "12/12" → 12 and "/12". */
  const parts = $derived(
    items.map(({ value }) => {
      const [, number = "0", after = ""] = value.match(/^(\d+)(.*)$/) ?? [];
      return { to: Number(number), after };
    }),
  );
  /** Where each figure is now: 0 to 1 of the way to its final value. */
  let k = $state(1);

  let list: HTMLElement;

  onMount(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (list.getBoundingClientRect().top < innerHeight) return;
    k = 0;
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        k = 1 - (1 - t) ** 3; // ease out
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    // Half of the first figure, not a share of the whole list: in one column the list is some
    // 500 px high, more than a low window (400% zoom) ever shows, and the figures stayed at 0.
    observer.observe(list.querySelector(".figure-value")!);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  });
</script>

<ul class="figures" bind:this={list}>
  {#each items as item, i (i)}
    <li>
      <a href={item.href}>
        <span class="figure-value" aria-hidden="true">{Math.round(parts[i]!.to * k)}{parts[i]!.after}</span>
        <span class="visually-hidden">{item.value} </span>
        <span class="figure-rest">{item.rest}</span>
        {" "}
        <span class="figure-was">{item.was}</span>
      </a>
    </li>
  {/each}
</ul>
