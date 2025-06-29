'use client';

import { useState, useEffect } from 'react';
import { discountGroupsService } from '../services/discountGroupsService';

export default function DiscountGroupsManagement() {
  const [discountGroups, setDiscountGroups] = useState([]);
  const [cartDiscounts, setCartDiscounts] = useState([]);
  const [priorityView, setPriorityView] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('groups'); // 'groups', 'assignments', 'priority'

  // Create Group Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupKey, setNewGroupKey] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupSortOrder, setNewGroupSortOrder] = useState(0.5);
  const [isCreating, setIsCreating] = useState(false);

  // Edit Group Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupSortOrder, setEditGroupSortOrder] = useState(0.5);
  const [isEditing, setIsEditing] = useState(false);

  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCartDiscount, setSelectedCartDiscount] = useState(null);
  const [selectedGroupForAssignment, setSelectedGroupForAssignment] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [groupsResult, cartDiscountsResult, priorityResult] = await Promise.all([
        discountGroupsService.getAllDiscountGroups(),
        discountGroupsService.getCartDiscountsWithGroups(),
        discountGroupsService.getDiscountsPriorityView()
      ]);

      if (groupsResult.error) {
        setError(groupsResult.error);
      } else {
        setDiscountGroups(groupsResult.discountGroups);
      }

      if (cartDiscountsResult.error) {
        setError(cartDiscountsResult.error);
      } else {
        setCartDiscounts(cartDiscountsResult.cartDiscounts);
      }

      if (priorityResult.error) {
        setError(priorityResult.error);
      } else {
        setPriorityView(priorityResult.discountsPriority);
      }
    } catch (err) {
      setError('Failed to load discount data');
      console.error('Error loading discount data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    if (!newGroupKey.trim() || !newGroupName.trim()) {
      setError('Group key and name are required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const { discountGroup, error } = await discountGroupsService.createDiscountGroup({
        key: newGroupKey.trim(),
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        sortOrder: newGroupSortOrder
      });

      if (error) {
        setError(error);
      } else {
        // Add new group to the list and sort by sortOrder
        const updatedGroups = [...discountGroups, discountGroup].sort((a, b) => b.sortOrder - a.sortOrder);
        setDiscountGroups(updatedGroups);
        
        // Reset form and close modal
        setNewGroupKey('');
        setNewGroupName('');
        setNewGroupDescription('');
        setNewGroupSortOrder(0.5);
        setIsCreateModalOpen(false);
        
        // Reload all data to get updated priority view
        loadAllData();
      }
    } catch (err) {
      setError('Failed to create discount group');
      console.error('Error creating discount group:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId, version) => {
    if (!confirm('Are you sure you want to delete this discount group? All cart discounts will be unassigned from this group.')) {
      return;
    }

    try {
      const { success, error } = await discountGroupsService.deleteDiscountGroup(groupId, version);
      
      if (error) {
        setError(error);
      } else {
        // Remove from local state and reload data
        setDiscountGroups(groups => groups.filter(group => group.id !== groupId));
        loadAllData();
      }
    } catch (err) {
      setError('Failed to delete discount group');
      console.error('Error deleting discount group:', err);
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupDescription(group.description);
    setEditGroupSortOrder(group.sortOrder);
    setIsEditModalOpen(true);
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    
    if (!editGroupName.trim()) {
      setError('Group name is required');
      return;
    }

    setIsEditing(true);
    setError(null);

    try {
      const fields = {};
      
      // Only include fields that have changed
      if (editGroupName.trim() !== editingGroup.name) {
        fields.name = editGroupName.trim();
      }
      
      if (editGroupDescription.trim() !== editingGroup.description) {
        fields.description = editGroupDescription.trim();
      }
      
      if (editGroupSortOrder !== editingGroup.sortOrder) {
        fields.sortOrder = editGroupSortOrder;
      }

      // If no fields changed, just close the modal
      if (Object.keys(fields).length === 0) {
        setIsEditModalOpen(false);
        setEditingGroup(null);
        return;
      }

      const { discountGroup, error } = await discountGroupsService.updateDiscountGroupFields(
        editingGroup.id,
        editingGroup.version,
        fields
      );

      if (error) {
        setError(error);
      } else {
        // Update the group in local state
        setDiscountGroups(groups => 
          groups.map(g => g.id === editingGroup.id ? discountGroup : g)
            .sort((a, b) => b.sortOrder - a.sortOrder)
        );
        
        // Reset form and close modal
        setEditGroupName('');
        setEditGroupDescription('');
        setEditGroupSortOrder(0.5);
        setIsEditModalOpen(false);
        setEditingGroup(null);
        
        // Reload all data to get updated priority view
        loadAllData();
      }
    } catch (err) {
      setError('Failed to update discount group');
      console.error('Error updating discount group:', err);
    } finally {
      setIsEditing(false);
    }
  };

  const handleAssignToGroup = async () => {
    if (!selectedCartDiscount || !selectedGroupForAssignment) {
      setError('Please select both a cart discount and a group');
      return;
    }

    setIsAssigning(true);
    setError(null);

    try {
      const { cartDiscount, error } = await discountGroupsService.assignCartDiscountToGroup(
        selectedCartDiscount.id,
        selectedCartDiscount.version,
        selectedGroupForAssignment
      );

      if (error) {
        setError(error);
      } else {
        setIsAssignModalOpen(false);
        setSelectedCartDiscount(null);
        setSelectedGroupForAssignment('');
        loadAllData(); // Reload to get updated assignments
      }
    } catch (err) {
      setError('Failed to assign cart discount to group');
      console.error('Error assigning cart discount:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveFromGroup = async (cartDiscount) => {
    if (!confirm(`Remove "${cartDiscount.name}" from its discount group?`)) {
      return;
    }

    try {
      const { cartDiscount: updatedDiscount, error } = await discountGroupsService.removeCartDiscountFromGroup(
        cartDiscount.id,
        cartDiscount.version
      );

      if (error) {
        setError(error);
      } else {
        loadAllData(); // Reload to get updated assignments
      }
    } catch (err) {
      setError('Failed to remove cart discount from group');
      console.error('Error removing cart discount from group:', err);
    }
  };

  const openAssignModal = (cartDiscount) => {
    setSelectedCartDiscount(cartDiscount);
    setIsAssignModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Discount Groups Management</h2>
        <p className="text-center text-gray-600">Loading discount groups...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-4 py-2 bg-indigo-600 text-gray-200 border-b-2 border-indigo-300 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Discount Groups Management</h2>
          <p className="text-sm mt-1 text-indigo-100">
            Manage discount groups and cart discount assignments
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-white text-indigo-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
        >
          Create New Group
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'groups'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Discount Groups ({discountGroups.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cart Discount Assignments ({cartDiscounts.length})
          </button>
          <button
            onClick={() => setActiveTab('priority')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'priority'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Priority View ({priorityView.length})
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'groups' && (
          <GroupsView 
            discountGroups={discountGroups} 
            cartDiscounts={cartDiscounts}
            onDeleteGroup={handleDeleteGroup}
            onEditGroup={handleEditGroup}
          />
        )}
        
        {activeTab === 'assignments' && (
          <AssignmentsView 
            cartDiscounts={cartDiscounts}
            discountGroups={discountGroups}
            onOpenAssignModal={openAssignModal}
            onRemoveFromGroup={handleRemoveFromGroup}
          />
        )}
        
        {activeTab === 'priority' && (
          <PriorityView priorityView={priorityView} />
        )}
      </div>

      {/* Create Group Modal */}
      {isCreateModalOpen && (
        <CreateGroupModal
          newGroupKey={newGroupKey}
          setNewGroupKey={setNewGroupKey}
          newGroupName={newGroupName}
          setNewGroupName={setNewGroupName}
          newGroupDescription={newGroupDescription}
          setNewGroupDescription={setNewGroupDescription}
          newGroupSortOrder={newGroupSortOrder}
          setNewGroupSortOrder={setNewGroupSortOrder}
          isCreating={isCreating}
          onSubmit={handleCreateGroup}
          onClose={() => {
            setIsCreateModalOpen(false);
            setNewGroupKey('');
            setNewGroupName('');
            setNewGroupDescription('');
            setNewGroupSortOrder(0.5);
            setError(null);
          }}
        />
      )}

      {/* Edit Group Modal */}
      {isEditModalOpen && (
        <EditGroupModal
          editingGroup={editingGroup}
          editGroupName={editGroupName}
          setEditGroupName={setEditGroupName}
          editGroupDescription={editGroupDescription}
          setEditGroupDescription={setEditGroupDescription}
          editGroupSortOrder={editGroupSortOrder}
          setEditGroupSortOrder={setEditGroupSortOrder}
          isEditing={isEditing}
          onSubmit={handleUpdateGroup}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingGroup(null);
            setEditGroupName('');
            setEditGroupDescription('');
            setEditGroupSortOrder(0.5);
            setError(null);
          }}
        />
      )}

      {/* Assignment Modal */}
      {isAssignModalOpen && (
        <AssignmentModal
          selectedCartDiscount={selectedCartDiscount}
          discountGroups={discountGroups}
          selectedGroupForAssignment={selectedGroupForAssignment}
          setSelectedGroupForAssignment={setSelectedGroupForAssignment}
          isAssigning={isAssigning}
          onAssign={handleAssignToGroup}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedCartDiscount(null);
            setSelectedGroupForAssignment('');
          }}
        />
      )}
    </div>
  );
}

// Groups View Component
function GroupsView({ discountGroups, cartDiscounts, onDeleteGroup, onEditGroup }) {
  if (discountGroups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No discount groups found.</p>
        <p className="text-sm text-gray-500">
          Create your first discount group to start organizing cart discounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {discountGroups.map((group) => {
        const groupCartDiscounts = cartDiscounts.filter(cd => 
          cd.discountGroup && cd.discountGroup.id === group.id
        );

        return (
          <div key={group.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Key: {group.key}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  Priority: {group.sortOrder}
                </span>
                <button
                  onClick={() => onEditGroup(group)}
                  className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteGroup(group.id, group.version)}
                  className="px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
              <span>Cart Discounts: {groupCartDiscounts.length}</span>
              <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
              {group.lastModifiedAt !== group.createdAt && (
                <span className="text-blue-600">
                  Modified: {new Date(group.lastModifiedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Cart Discounts in this group */}
            {groupCartDiscounts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Cart Discounts in this Group:</h4>
                <div className="space-y-2">
                  {groupCartDiscounts.map((discount) => (
                    <div key={discount.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm font-medium text-gray-800">{discount.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Priority: {discount.sortOrder}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          discount.isActive 
                            ? 'text-green-800 bg-green-100' 
                            : 'text-red-800 bg-red-100'
                        }`}>
                          {discount.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {discount.requiresDiscountCode && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            Code Required
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Assignments View Component
function AssignmentsView({ cartDiscounts, discountGroups, onOpenAssignModal, onRemoveFromGroup }) {
  const unassignedDiscounts = cartDiscounts.filter(cd => !cd.discountGroup);
  const assignedDiscounts = cartDiscounts.filter(cd => cd.discountGroup);

  return (
    <div className="space-y-6">
      {/* Unassigned Cart Discounts */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Unassigned Cart Discounts ({unassignedDiscounts.length})
        </h3>
        {unassignedDiscounts.length === 0 ? (
          <p className="text-gray-600 text-sm">All cart discounts are assigned to groups.</p>
        ) : (
          <div className="space-y-2">
            {unassignedDiscounts.map((discount) => (
              <div key={discount.id} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                <div>
                  <span className="font-medium text-gray-800">{discount.name}</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">Priority: {discount.sortOrder}</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      discount.isActive 
                        ? 'text-green-800 bg-green-100' 
                        : 'text-red-800 bg-red-100'
                    }`}>
                      {discount.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {discount.requiresDiscountCode && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Code Required
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onOpenAssignModal(discount)}
                  className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
                >
                  Assign to Group
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Cart Discounts */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Assigned Cart Discounts ({assignedDiscounts.length})
        </h3>
        {assignedDiscounts.length === 0 ? (
          <p className="text-gray-600 text-sm">No cart discounts are assigned to groups yet.</p>
        ) : (
          <div className="space-y-2">
            {assignedDiscounts.map((discount) => (
              <div key={discount.id} className="flex items-center justify-between bg-blue-50 p-3 rounded border border-blue-200">
                <div>
                  <span className="font-medium text-gray-800">{discount.name}</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">Priority: {discount.sortOrder}</span>
                    <span className="text-xs text-blue-600 font-medium">
                      Group: {discount.discountGroup.name}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      discount.isActive 
                        ? 'text-green-800 bg-green-100' 
                        : 'text-red-800 bg-red-100'
                    }`}>
                      {discount.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {discount.requiresDiscountCode && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Code Required
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onOpenAssignModal(discount)}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                  >
                    Reassign
                  </button>
                  <button
                    onClick={() => onRemoveFromGroup(discount)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Priority View Component
function PriorityView({ priorityView }) {
  if (priorityView.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No discounts or discount groups found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Priority Order Explanation:</h3>
        <p className="text-sm text-blue-700">
          Items are listed in priority order (highest to lowest sortOrder). 
          Higher sortOrder values are applied first. Discount Groups ensure only the best deal from within the group applies.
        </p>
      </div>

      {priorityView.map((item, index) => (
        <div key={`${item.type}-${item.id}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  item.type === 'discount-group' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  #{index + 1} {item.type === 'discount-group' ? 'Discount Group' : 'Cart Discount'}
                </span>
                <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
              </div>
              {item.description && (
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>Priority: <span className="font-semibold">{item.sortOrder}</span></span>
                {item.key && <span>Key: {item.key}</span>}
                {item.type === 'cart-discount' && (
                  <>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      item.isActive 
                        ? 'text-green-800 bg-green-100' 
                        : 'text-red-800 bg-red-100'
                    }`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {item.requiresDiscountCode && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Code Required
                      </span>
                    )}
                    {item.stackingMode && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {item.stackingMode}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Show cart discounts within discount group */}
          {item.type === 'discount-group' && item.cartDiscounts && item.cartDiscounts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Cart Discounts in this Group ({item.cartDiscounts.length}):
              </h4>
              <div className="space-y-2">
                {item.cartDiscounts.map((discount) => (
                  <div key={discount.id} className="flex items-center justify-between bg-purple-50 p-2 rounded">
                    <span className="text-sm font-medium text-gray-800">{discount.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Priority: {discount.sortOrder}</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        discount.isActive 
                          ? 'text-green-800 bg-green-100' 
                          : 'text-red-800 bg-red-100'
                      }`}>
                        {discount.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {discount.requiresDiscountCode && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          Code Required
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-purple-600 mt-2 italic">
                Only the best deal from this group will apply to the cart.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Edit Group Modal Component
function EditGroupModal({
  editingGroup,
  editGroupName, setEditGroupName,
  editGroupDescription, setEditGroupDescription,
  editGroupSortOrder, setEditGroupSortOrder,
  isEditing, onSubmit, onClose
}) {
  // Check if any fields have changed
  const hasChanges = () => {
    return (
      editGroupName.trim() !== editingGroup.name ||
      editGroupDescription.trim() !== editingGroup.description ||
      editGroupSortOrder !== editingGroup.sortOrder
    );
  };

  const getChangedFields = () => {
    const changes = [];
    if (editGroupName.trim() !== editingGroup.name) {
      changes.push('Name');
    }
    if (editGroupDescription.trim() !== editingGroup.description) {
      changes.push('Description');
    }
    if (editGroupSortOrder !== editingGroup.sortOrder) {
      changes.push('Sort Order');
    }
    return changes;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Edit Discount Group</h3>
        
        {hasChanges() && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Changes detected:</span> {getChangedFields().join(', ')}
            </p>
          </div>
        )}
        
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Key (Read-only)
            </label>
            <input
              type="text"
              value={editingGroup?.key || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Group key cannot be changed after creation
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
              {editGroupName.trim() !== editingGroup.name && (
                <span className="text-blue-600 text-xs ml-2">(changed)</span>
              )}
            </label>
            <input
              type="text"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                editGroupName.trim() !== editingGroup.name 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-300'
              }`}
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
              {editGroupDescription.trim() !== editingGroup.description && (
                <span className="text-blue-600 text-xs ml-2">(changed)</span>
              )}
            </label>
            <textarea
              value={editGroupDescription}
              onChange={(e) => setEditGroupDescription(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                editGroupDescription.trim() !== editingGroup.description 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-300'
              }`}
              placeholder="Enter description"
              rows="3"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort Order (Priority)
              {editGroupSortOrder !== editingGroup.sortOrder && (
                <span className="text-blue-600 text-xs ml-2">(changed)</span>
              )}
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={editGroupSortOrder}
              onChange={(e) => setEditGroupSortOrder(parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                editGroupSortOrder !== editingGroup.sortOrder 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-300'
              }`}
              placeholder="0.5"
            />
            <p className="text-xs text-gray-500 mt-1">
              Value between 0 and 1. Higher values have higher priority.
              {editGroupSortOrder !== editingGroup.sortOrder && (
                <span className="text-blue-600 ml-1">
                  (was: {editingGroup.sortOrder})
                </span>
              )}
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isEditing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${
                hasChanges() 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={isEditing || !hasChanges()}
            >
              {isEditing ? 'Updating...' : hasChanges() ? 'Update Group' : 'No Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create Group Modal Component
function CreateGroupModal({
  newGroupKey, setNewGroupKey,
  newGroupName, setNewGroupName,
  newGroupDescription, setNewGroupDescription,
  newGroupSortOrder, setNewGroupSortOrder,
  isCreating, onSubmit, onClose
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Create New Discount Group</h3>
        
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Key *
            </label>
            <input
              type="text"
              value={newGroupKey}
              onChange={(e) => setNewGroupKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., black-friday-2024"
              pattern="^[A-Za-z0-9_-]+$"
              title="Only letters, numbers, hyphens, and underscores are allowed"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier (letters, numbers, hyphens, underscores only)
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter description (optional)"
              rows="3"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort Order (Priority)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={newGroupSortOrder}
              onChange={(e) => setNewGroupSortOrder(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0.5"
            />
            <p className="text-xs text-gray-500 mt-1">
              Value between 0 and 1. Higher values have higher priority.
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Assignment Modal Component
function AssignmentModal({
  selectedCartDiscount,
  discountGroups,
  selectedGroupForAssignment,
  setSelectedGroupForAssignment,
  isAssigning,
  onAssign,
  onClose
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Assign Cart Discount to Group
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cart Discount
          </label>
          <div className="p-3 bg-gray-50 rounded border">
            <span className="font-medium">{selectedCartDiscount?.name}</span>
            <div className="text-sm text-gray-500 mt-1">
              Priority: {selectedCartDiscount?.sortOrder}
              {selectedCartDiscount?.discountGroup && (
                <span className="ml-2 text-blue-600">
                  Currently in: {selectedCartDiscount.discountGroup.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign to Discount Group
          </label>
          <select
            value={selectedGroupForAssignment}
            onChange={(e) => setSelectedGroupForAssignment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a discount group...</option>
            {discountGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} (Priority: {group.sortOrder})
              </option>
            ))}
          </select>
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            disabled={isAssigning}
          >
            Cancel
          </button>
          <button
            onClick={onAssign}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            disabled={isAssigning || !selectedGroupForAssignment}
          >
            {isAssigning ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}