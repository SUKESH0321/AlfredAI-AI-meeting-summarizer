import * as actionItemRepo from '../database/repositories/actionItemRepository.js';

export const updateActionItem = async (req, res) => {
  try {
    const { task, assignee, deadline, status } = req.body;
    
    // Explicitly validate constrained domains as bounded internally
    if (status && !['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: "Invalid status format mapping" } });
    }

    const currentItem = await actionItemRepo.updateActionItem(req.params.id, {
      ...(task && { task }),
      ...(assignee !== undefined && { assignee }),
      ...(deadline !== undefined && { deadline }),
      ...(status && { status })
    });

    res.json({ success: true, actionItem: currentItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
