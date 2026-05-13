import { Card, CardContent } from '@/components/ui/card'

function HelpPage() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="text-center border border-[#1a1a1a] p-3">
        <h1 className="text-lg font-bold">
          <span className="text-primary">$</span> man soda
        </h1>
      </div>

      <Card>
        <CardContent className="pt-3 space-y-2 text-xs">
          <p className="section-header font-bold">About</p>
          <p className="text-muted-foreground">
            soda-autoclicker &mdash; free, open-source auto-clicker for minecraft java 1.8.9 pvp.
            bypasses anticheats on servers like hypixel with cps randomization, block hit,
            jitter simulation, and more.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-3 space-y-2 text-xs">
          <p className="section-header font-bold">Usage</p>
          <p className="text-muted-foreground">left/right clicker: configure cps, mode (hold/always), toggle bind.</p>
          <p className="text-muted-foreground">block hit: random blocks between clicks for reduced kb (mc 1.8.9).</p>
          <p className="text-muted-foreground">smart bh: alternates left + right-click hold while bind is held.</p>
          <p className="text-muted-foreground">recorder: records your natural clicking and replays it.</p>
          <p className="text-muted-foreground">movement: w-tap, auto sprint, socd input cleaner, fast stop.</p>
          <p className="text-muted-foreground">potions: auto-throws potions in sequence from lowest to highest slot.</p>
          <p className="text-muted-foreground">rod/pearl: one-press macros to throw and switch back to sword.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-3 space-y-2 text-xs">
          <p className="section-header font-bold">Tips</p>
          <p className="text-muted-foreground">keep left cps under 20 on hypixel to avoid detection.</p>
          <p className="text-muted-foreground">use blatant mode only on servers with weak anticheat.</p>
          <p className="text-muted-foreground">block hit chance above 50% can make movement difficult.</p>
          <p className="text-muted-foreground">recorder replays your exact pattern for natural clicks.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-3 space-y-2 text-xs">
          <p className="section-header font-bold">Community</p>
          <p className="text-muted-foreground">discord: https://discord.gg/4ZqBfDFMG4</p>
          <p className="text-muted-foreground">github: https://github.com/Dream23322/Soda-Autoclicker/</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default HelpPage
