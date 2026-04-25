import React from 'react';
import Icon from '@/components/ui/AppIcon';

export default function ContactCard() {
  return (
    <div className="bg-white rounded-xl border border-border shadow-card p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon name="ChatBubbleLeftRightIcon" size={16} className="text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Des questions ?</h2>
      </div>

      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Notre équipe est disponible du lundi au vendredi, de 8h à 17h pour répondre à vos questions.
      </p>

      <div className="space-y-3 flex-1">
        <a
          href="tel:+213800000000"
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-secondary/40 transition-colors group"
        >
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="PhoneIcon" size={15} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Téléphone</p>
            <p className="text-sm font-semibold text-primary group-hover:underline">+213 800 000 000</p>
          </div>
        </a>

        <a
          href="mailto:support@nfn.dz"
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-secondary/40 transition-colors group"
        >
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="EnvelopeIcon" size={15} className="text-accent" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-semibold text-accent group-hover:underline">support@nfn.dz</p>
          </div>
        </a>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Référence éleveur :{' '}
          <span className="font-mono font-semibold text-foreground">src-0042</span>
        </p>
      </div>
    </div>
  );
}