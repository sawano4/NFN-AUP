import Modal from './Modal'

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Confirmer la suppression" onClose={onCancel}>
      <p className="text-sm text-gray-600 mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>Annuler</button>
        <button className="btn-danger" onClick={onConfirm}>Supprimer</button>
      </div>
    </Modal>
  )
}
