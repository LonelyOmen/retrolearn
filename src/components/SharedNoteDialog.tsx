import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

interface SharedNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Minimal shape used by WorkRoom page
  note?: {
    title?: string | null
    summary?: string | null
    original_content?: string | null
    key_points?: string[] | null
  } | null
}

export default function SharedNoteDialog({ open, onOpenChange, note }: SharedNoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{note?.title || 'Shared Note'}</DialogTitle>
          <DialogDescription>Preview of the shared note</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {note?.summary && (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Summary</h3>
              <p className="text-sm whitespace-pre-wrap">{note.summary}</p>
            </section>
          )}

          {Array.isArray(note?.key_points) && note?.key_points?.length ? (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Key points</h3>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {note.key_points!.map((kp, i) => (
                  <li key={i}>{kp}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {!note?.summary && note?.original_content && (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Excerpt</h3>
              <ScrollArea className="h-48 border rounded-md p-3">
                <p className="text-sm whitespace-pre-wrap">
                  {note.original_content?.slice(0, 1200)}
                </p>
              </ScrollArea>
            </section>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (note?.summary) navigator.clipboard.writeText(note.summary)
              }}
              disabled={!note?.summary}
            >
              Copy summary
            </Button>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
