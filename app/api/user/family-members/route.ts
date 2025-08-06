import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const familyMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  relationship: z.string().min(1, 'Relationship is required').max(50, 'Relationship too long'),
  birthday: z.string().optional().nullable().transform(val => val === '' ? null : val),
  memorial_date: z.string().optional().nullable().transform(val => val === '' ? null : val)
})

const addMemberSchema = familyMemberSchema

const updateMemberSchema = z.object({
  original: familyMemberSchema,
  updated: familyMemberSchema
})

const deleteMemberSchema = z.object({
  member: familyMemberSchema
})

type FamilyMember = z.infer<typeof familyMemberSchema>

// Helper function to get user's current family members
async function getUserFamilyMembers(email: string): Promise<FamilyMember[]> {
  const result = await query(`
    SELECT important_people 
    FROM users 
    WHERE email = $1
  `, [email])
  
  if (!result.rows[0]) {
    throw new Error('User not found')
  }
  
  const importantPeople = result.rows[0].important_people
  if (!importantPeople) {
    return []
  }
  
  try {
    return typeof importantPeople === 'string' 
      ? JSON.parse(importantPeople)
      : importantPeople
  } catch (error) {
    console.error('Error parsing important_people JSON:', error)
    return []
  }
}

// Helper function to update user's family members
async function updateUserFamilyMembers(email: string, familyMembers: FamilyMember[]): Promise<void> {
  await query(`
    UPDATE users 
    SET important_people = $1, updated_at = CURRENT_TIMESTAMP
    WHERE email = $2
  `, [JSON.stringify(familyMembers), email])
}

// GET /api/user/family-members - Retrieve user's family members
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const familyMembers = await getUserFamilyMembers(session.user.email)

    return NextResponse.json({
      success: true,
      familyMembers
    })

  } catch (error: any) {
    console.error('Error fetching family members:', error)
    
    if (error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch family members' },
      { status: 500 }
    )
  }
}

// POST /api/user/family-members - Add new family member
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const newMember = addMemberSchema.parse(body)

    // Get current family members
    const currentMembers = await getUserFamilyMembers(session.user.email)

    // Check for duplicates (same name and relationship)
    const isDuplicate = currentMembers.some(member => 
      member.name.toLowerCase() === newMember.name.toLowerCase() &&
      member.relationship.toLowerCase() === newMember.relationship.toLowerCase()
    )

    if (isDuplicate) {
      return NextResponse.json({
        error: 'Family member with this name and relationship already exists'
      }, { status: 400 })
    }

    // Add new member
    const updatedMembers = [...currentMembers, newMember]
    await updateUserFamilyMembers(session.user.email, updatedMembers)

    return NextResponse.json({
      success: true,
      familyMembers: updatedMembers,
      message: 'Family member added successfully'
    })

  } catch (error: any) {
    console.error('Error adding family member:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    if (error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to add family member' },
      { status: 500 }
    )
  }
}

// PUT /api/user/family-members - Update existing family member
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { original, updated } = updateMemberSchema.parse(body)

    // Get current family members
    const currentMembers = await getUserFamilyMembers(session.user.email)

    // Find the member to update
    const memberIndex = currentMembers.findIndex(member =>
      member.name === original.name &&
      member.relationship === original.relationship
    )

    if (memberIndex === -1) {
      return NextResponse.json({
        error: 'Original family member not found'
      }, { status: 404 })
    }

    // Check if the updated member would create a duplicate (excluding the current member)
    const wouldBeDuplicate = currentMembers.some((member, index) =>
      index !== memberIndex &&
      member.name.toLowerCase() === updated.name.toLowerCase() &&
      member.relationship.toLowerCase() === updated.relationship.toLowerCase()
    )

    if (wouldBeDuplicate) {
      return NextResponse.json({
        error: 'A family member with this name and relationship already exists'
      }, { status: 400 })
    }

    // Update the member
    const updatedMembers = [...currentMembers]
    updatedMembers[memberIndex] = updated
    await updateUserFamilyMembers(session.user.email, updatedMembers)

    return NextResponse.json({
      success: true,
      familyMembers: updatedMembers,
      message: 'Family member updated successfully'
    })

  } catch (error: any) {
    console.error('Error updating family member:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    if (error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to update family member' },
      { status: 500 }
    )
  }
}

// DELETE /api/user/family-members - Remove family member
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { member } = deleteMemberSchema.parse(body)

    // Get current family members
    const currentMembers = await getUserFamilyMembers(session.user.email)

    // Find and remove the member
    const updatedMembers = currentMembers.filter(existingMember =>
      !(existingMember.name === member.name &&
        existingMember.relationship === member.relationship)
    )

    // Check if member was actually found and removed
    if (updatedMembers.length === currentMembers.length) {
      return NextResponse.json({
        error: 'Family member not found'
      }, { status: 404 })
    }

    await updateUserFamilyMembers(session.user.email, updatedMembers)

    return NextResponse.json({
      success: true,
      familyMembers: updatedMembers,
      message: 'Family member deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting family member:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    if (error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to delete family member' },
      { status: 500 }
    )
  }
}