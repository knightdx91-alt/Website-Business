# Tap the Tank to Pay

A plan for King Fish Aquatics, October 2026. Nothing here is built yet. It describes how customers could pay for their fish on their phone at the tank, and what has to be decided before building it.

## The short version

- **One NFC sticker per tank,** with a QR code printed next to it. Tapping opens that tank's page on the customer's phone, listing every fish in it with its price and how many are left.
- **The customer picks fish and pays** with Apple Pay, Google Pay or a card. They can tap more tanks and add to the same order.
- **The receipt shows every fish and the tank it comes from,** plus a QR code.
- **At the counter, the cashier scans the receipt** with the shop's tablet, nets and bags the fish tank by tank, and ticks each line. The order is then marked picked up, so the same receipt can't be used twice.
- **The money goes straight to King Fish's own Stripe account,** never through ours.

## What's already built

Most of the pieces exist today. Tap to pay connects them.

- **A page per tank:** every tank on the board already has its own section, with a link the QR price tags point at.
- **Live counts:** the board and the tablet keep "how many left" up to date, and the price page hides sold-out fish.
- **The tablet by the tanks:** it already has a staff mode behind a PIN, which is where the receipt check would live.
- **Stripe:** the app already takes card payments and refunds for our own plans.

## How it works in the store

1. **The customer taps the sticker on a tank,** or scans the QR code next to it if their phone's NFC is off.
2. **The tank's page opens,** titled with the tank's name from the board, for example "Tank 3" or "Cichlid wall". It shows each fish with a photo, the price and how many are left.
3. **They choose fish and quantities.** Tapping another tank adds to the same order. The order is kept on their phone for 30 minutes.
4. **They pay** with Apple Pay, Google Pay or a card. Paying takes the fish off that tank's count right away, so nobody else can buy the same fish.
5. **They get a receipt** on screen and by text or email if they want it. It lists each fish with its tank and shows an order number and a QR code.
6. **At the counter, the cashier scans the receipt QR** with the shop tablet. A big green check confirms it's paid and not yet picked up.
7. **The cashier walks the tanks in the order the receipt lists them,** nets the fish, bags them and ticks each line. When every line is ticked, the order is marked picked up.

## What the receipt and the cashier's screen show

Every line carries the tank, because the tank is known the moment the customer taps:

| Line on the receipt | What it tells the cashier |
| --- | --- |
| 2 × Neon tetra · Tank 3 | Net two from Tank 3 |
| 1 × Bristlenose pleco · Tank 7 | Net one from Tank 7 |
| 3 × Cherry shrimp · Shrimp rack, top | Net three from the top shrimp tank |

- **Grouped by tank,** so the cashier walks the tanks once with one net.
- **The same fish in two tanks:** if neon tetras sit in both Tank 3 and Tank 8, maybe at different prices, the customer pays for the ones in the tank they tapped, and the count comes off that tank only.
- **Order number and time,** so a question later can be traced.
- **Picked up, with the time and who ticked it,** once the cashier finishes. Scanning a picked-up receipt again shows a red "already picked up" screen.

## The tags

- **One tag per tank,** not per fish. The tag only opens the tank's page; the page does the choosing.
- **NTAG215 stickers,** under $1 each.
- **Stick them on the tank's frame or the price label,** not on the glass with water behind it, which can weaken the signal.
- **Print a QR code next to each tag.** Every recent iPhone and nearly every Android phone reads NFC tags with no app, but Android phones need NFC turned on. The QR covers everyone else.
- **The existing QR price tag sheets** can carry the tag: the label with the QR code, the NFC sticker on its back.

## What has to be solved first

- **The money goes to King Fish, not to us.** King Fish connects their own Stripe account through Stripe Connect. Their sales are paid out to their bank on Stripe's normal schedule. This is the biggest piece of the build, and it keeps us out of handling their sales money.
- **Sales tax.** Alabama taxes these sales. The page adds tax at King Fish's combined state and local rate, set in their settings. Their accountant confirms the rate.
- **Card fees on cheap fish.** Stripe takes 2.9% plus 30¢ per payment. On a $3 tetra that's about 12%. A minimum order of around $10, or paying once for several tanks, keeps it reasonable.
- **Counts have to be right.** If the board says 5 left and there are really 3, someone pays for fish that aren't there. When that happens, the cashier taps "short" on the line and the app refunds the difference automatically. The tablet's − and + buttons keep counts honest during the day.
- **Fish that shouldn't be sold.** A "not for sale" switch per tank, for quarantine or treatment, hides the Pay button and says why.
- **Fish that need a word first.** Some fish are hard to keep, or don't get along with others. A "staff will confirm" switch per fish lets the customer reserve it on their phone, then pay at the counter after talking with staff.
- **Unique fish.** A one-of-a-kind fish gets its own row with its own photo, so the customer sees exactly which one they're buying.
- **Unpaid orders.** A picked order that isn't paid within 30 minutes is dropped, and the fish go back on the count.
- **Refunds and the shop's guarantee.** Any livestock guarantee stays King Fish's own policy. Refunds are done from their board, through their Stripe account.

## What we'd build

| Piece | What it does |
| --- | --- |
| Tank pay page | The tank's fish, quantities, an order that spans tanks, the Pay button |
| Stripe Connect | Links King Fish's Stripe account; payments land there |
| Tax and minimum order | Settings on the board |
| Receipt | Fish grouped by tank, order number, QR code, optional text or email |
| Counter check | Scan on the tablet, tick lines per tank, picked-up stamp, already-picked-up warning |
| Short-count refund | Cashier taps "short" and the difference is refunded |
| Switches | Not for sale per tank, staff will confirm per fish |
| Orders list | Today's paid, waiting and picked-up orders on the board |

## How we'd sell it

- **As a monthly inventory add-on,** listed next to Barcode scanning. It needs the live price list, which every plan already includes.
- **Hardware stays the shop's own:** the stickers and the tablet, as with everything else.
- **The shop pays Stripe's fees,** as with any card sale.

## Questions for King Fish before we build

- Do they want customers paying without talking to staff first, for every fish, or only some?
- Which tanks are never for sale, such as display or quarantine tanks?
- Is there a minimum order they'd like?
- Do they already use Stripe, or another card system at the counter?
- What is their livestock guarantee, so the receipt can say it?
- Who will scan receipts: one counter, or anyone with the tablet?
