import { supabaseServer } from '../supabase/server';
import {
  ClassifiedField,
  FieldMapping,
  Profile,
  HouseholdMember,
  SavedDate,
  AutoFillRequest,
  AutoFillResponse,
} from '../types';

export interface AutoFillContext {
  profile: Profile | null;
  householdMembers: HouseholdMember[];
  savedDates: SavedDate[];
}

export class AutoFillService {
  private static readonly FIELD_SYNONYMS: Record<string, string[]> = {
    // Name variations
    'name': ['full_name', 'patient_name', 'client_name', 'student_name', 'applicant_name', 'member_name'],
    'first_name': ['fname', 'given_name', 'first', 'firstname'],
    'last_name': ['lname', 'surname', 'family_name', 'last', 'lastname'],
    
    // Contact information
    'email': ['email_address', 'e_mail', 'electronic_mail', 'contact_email'],
    'phone': ['phone_number', 'telephone', 'mobile', 'cell', 'contact_number', 'primary_phone'],
    
    // Address variations
    'address': ['street_address', 'home_address', 'mailing_address', 'residence'],
    'street': ['street_address', 'address_line_1', 'addr1'],
    'city': ['city_name', 'town'],
    'state': ['state_province', 'province', 'region'],
    'zip': ['zip_code', 'postal_code', 'zipcode'],
    
    // Date variations
    'date_of_birth': ['dob', 'birth_date', 'birthdate', 'born'],
    'today': ['current_date', 'todays_date', 'date_signed', 'signature_date'],
    
    // Healthcare specific
    'patient': ['client', 'member', 'individual'],
    'guardian': ['parent', 'legal_guardian', 'responsible_party'],
    'emergency_contact': ['emergency', 'contact_person', 'in_case_of_emergency'],
    
    // Financial
    'ssn': ['social_security_number', 'social_security', 'tax_id'],
    'insurance': ['insurance_number', 'policy_number', 'member_id'],
  };

  private static readonly DATE_PATTERNS: Record<string, (savedDates: SavedDate[]) => string | null> = {
    'today': () => new Date().toLocaleDateString('en-US'),
    'date_of_birth': (dates) => dates.find(d => d.label.toLowerCase().includes('birth'))?.value || null,
    'immunization_date': (dates) => dates.find(d => d.label.toLowerCase().includes('immunization'))?.value || null,
    'appointment_date': (dates) => dates.find(d => d.label.toLowerCase().includes('appointment'))?.value || null,
  };

  /**
   * Auto-fill form fields based on user profile and context
   */
  static async autoFillFields(
    fields: ClassifiedField[],
    userId: string,
    householdMemberId?: string
  ): Promise<AutoFillResponse> {
    const startTime = Date.now();

    try {
      // Get user context data
      const context = await this.getUserContext(userId, householdMemberId);
      
      // Generate field mappings
      const mappings = this.generateFieldMappings(fields, context);
      
      // Calculate auto-fill statistics
      const autoFilledCount = mappings.filter(m => m.value !== null && m.value !== '').length;
      
      return {
        success: true,
        data: {
          upload_id: '', // Will be set by caller
          mappings,
          auto_filled_count: autoFilledCount,
          total_fields: fields.length,
        },
      };
    } catch (error) {
      console.error('Auto-fill error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Auto-fill failed',
      };
    }
  }

  /**
   * Get user context data for auto-fill
   */
  private static async getUserContext(
    userId: string,
    householdMemberId?: string
  ): Promise<AutoFillContext> {
    try {
      // Get user profile
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get household members
      const { data: householdMembers } = await supabaseServer
        .from('household_members')
        .select('*')
        .eq('user_id', userId);

      // Get saved dates
      const { data: savedDates } = await supabaseServer
        .from('saved_dates')
        .select('*')
        .eq('user_id', userId);

      return {
        profile: profile || null,
        householdMembers: householdMembers || [],
        savedDates: savedDates || [],
      };
    } catch (error) {
      console.error('Error fetching user context:', error);
      return {
        profile: null,
        householdMembers: [],
        savedDates: [],
      };
    }
  }

  /**
   * Generate field mappings based on context
   */
  private static generateFieldMappings(
    fields: ClassifiedField[],
    context: AutoFillContext
  ): FieldMapping[] {
    const mappings: FieldMapping[] = [];

    for (const field of fields) {
      const mapping = this.mapField(field, context);
      mappings.push(mapping);
    }

    return mappings;
  }

  /**
   * Map a single field to a value from context
   */
  private static mapField(field: ClassifiedField, context: AutoFillContext): FieldMapping {
    const normalizedKey = this.normalizeFieldKey(field.key);
    
    // Try to match with profile data
    const profileMatch = this.matchProfileField(normalizedKey, field, context);
    if (profileMatch) {
      return profileMatch;
    }

    // Try to match with saved dates
    const dateMatch = this.matchDateField(normalizedKey, field, context);
    if (dateMatch) {
      return dateMatch;
    }

    // Try to match with household members (if applicable)
    const householdMatch = this.matchHouseholdField(normalizedKey, field, context);
    if (householdMatch) {
      return householdMatch;
    }

    // Return empty mapping if no match found
    return {
      field_id: field.id,
      value: null,
      source: 'manual',
      source_id: null,
      confidence: 0,
    };
  }

  /**
   * Match field with profile data
   */
  private static matchProfileField(
    key: string,
    field: ClassifiedField,
    context: AutoFillContext
  ): FieldMapping | null {
    if (!context.profile) return null;

    const profile = context.profile;
    
    // Direct field matches
    const directMatches: Record<string, any> = {
      'name': profile.full_name,
      'full_name': profile.full_name,
      'email': profile.email,
      'phone': profile.phone,
      'date_of_birth': profile.date_of_birth,
    };

    // Address field matches
    if (profile.address && typeof profile.address === 'object') {
      const address = profile.address as any;
      Object.assign(directMatches, {
        'address': `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim(),
        'street': address.street,
        'city': address.city,
        'state': address.state,
        'zip': address.zip,
        'zipcode': address.zip,
        'postal_code': address.zip,
      });
    }

    // Custom fields
    if (profile.custom_fields && typeof profile.custom_fields === 'object') {
      Object.assign(directMatches, profile.custom_fields);
    }

    // Check for direct match
    if (directMatches[key]) {
      return {
        field_id: field.id,
        value: directMatches[key],
        source: 'profile',
        source_id: profile.id,
        confidence: 0.95,
      };
    }

    // Check for synonym matches
    for (const [standardKey, synonyms] of Object.entries(this.FIELD_SYNONYMS)) {
      if (synonyms.includes(key) && directMatches[standardKey]) {
        return {
          field_id: field.id,
          value: directMatches[standardKey],
          source: 'profile',
          source_id: profile.id,
          confidence: 0.8,
        };
      }
    }

    // Fuzzy matching for similar field names
    const fuzzyMatch = this.findFuzzyMatch(key, Object.keys(directMatches));
    if (fuzzyMatch && directMatches[fuzzyMatch]) {
      return {
        field_id: field.id,
        value: directMatches[fuzzyMatch],
        source: 'profile',
        source_id: profile.id,
        confidence: 0.6,
      };
    }

    return null;
  }

  /**
   * Match field with date data
   */
  private static matchDateField(
    key: string,
    field: ClassifiedField,
    context: AutoFillContext
  ): FieldMapping | null {
    if (field.type !== 'date') return null;

    // Check pattern matches
    for (const [pattern, resolver] of Object.entries(this.DATE_PATTERNS)) {
      if (key.includes(pattern) || this.FIELD_SYNONYMS[pattern]?.some(syn => key.includes(syn))) {
        const value = resolver(context.savedDates);
        if (value) {
          const savedDate = context.savedDates.find(d => d.value === value);
          return {
            field_id: field.id,
            value: this.formatDate(value),
            source: 'saved_date',
            source_id: savedDate?.id || null,
            confidence: 0.9,
          };
        }
      }
    }

    // Try to match with saved date labels
    for (const savedDate of context.savedDates) {
      const similarity = this.calculateStringSimilarity(key, savedDate.label.toLowerCase());
      if (similarity > 0.7) {
        return {
          field_id: field.id,
          value: this.formatDate(savedDate.value),
          source: 'saved_date',
          source_id: savedDate.id,
          confidence: similarity,
        };
      }
    }

    return null;
  }

  /**
   * Match field with household member data
   */
  private static matchHouseholdField(
    key: string,
    field: ClassifiedField,
    context: AutoFillContext
  ): FieldMapping | null {
    if (context.householdMembers.length === 0) return null;

    // Look for relationship indicators in the field key or label
    const relationshipIndicators = ['child', 'spouse', 'dependent', 'family', 'guardian', 'parent'];
    const hasRelationshipIndicator = relationshipIndicators.some(indicator => 
      key.includes(indicator) || field.label.toLowerCase().includes(indicator)
    );

    if (!hasRelationshipIndicator) return null;

    // Find the most appropriate household member
    let bestMatch: HouseholdMember | null = null;
    let bestScore = 0;

    for (const member of context.householdMembers) {
      const score = this.scorehouseholdMemberMatch(key, field, member);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = member;
      }
    }

    if (bestMatch && bestScore > 0.5) {
      const value = this.extractHouseholdMemberValue(key, field, bestMatch);
      if (value) {
        return {
          field_id: field.id,
          value,
          source: 'household_member',
          source_id: bestMatch.id,
          confidence: bestScore,
        };
      }
    }

    return null;
  }

  /**
   * Score how well a household member matches a field
   */
  private static scorehouseholdMemberMatch(
    key: string,
    field: ClassifiedField,
    member: HouseholdMember
  ): number {
    let score = 0;

    // Check relationship match
    if (member.relationship && key.includes(member.relationship.toLowerCase())) {
      score += 0.8;
    }

    // Check age appropriateness for child-related fields
    if (key.includes('child') || key.includes('minor')) {
      const age = this.calculateAge(member.date_of_birth);
      if (age !== null && age < 18) {
        score += 0.6;
      }
    }

    // Check spouse-related fields
    if (key.includes('spouse') && member.relationship?.toLowerCase() === 'spouse') {
      score += 0.9;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Extract value from household member for a field
   */
  private static extractHouseholdMemberValue(
    key: string,
    field: ClassifiedField,
    member: HouseholdMember
  ): string | null {
    if (key.includes('name')) {
      return member.name;
    }
    
    if (key.includes('birth') || key.includes('dob')) {
      return member.date_of_birth;
    }
    
    if (key.includes('relationship')) {
      return member.relationship;
    }

    // Check custom fields
    if (member.custom_fields && typeof member.custom_fields === 'object') {
      const customValue = (member.custom_fields as any)[key];
      if (customValue) {
        return customValue;
      }
    }

    return null;
  }

  /**
   * Normalize field key for matching
   */
  private static normalizeFieldKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Find fuzzy string match
   */
  private static findFuzzyMatch(target: string, candidates: string[]): string | null {
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const score = this.calculateStringSimilarity(target, candidate);
      if (score > bestScore && score > 0.7) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len2][len1]) / maxLen;
  }

  /**
   * Calculate age from date of birth
   */
  private static calculateAge(dateOfBirth: string | null): number | null {
    if (!dateOfBirth) return null;
    
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Format date for form display
   */
  private static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US'); // MM/DD/YYYY format
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  }

  /**
   * Update field mappings based on user edits
   */
  static async updateFieldMapping(
    uploadId: string,
    fieldId: string,
    newValue: any,
    saveToProfile: boolean = false,
    userId: string
  ): Promise<boolean> {
    try {
      // If user wants to save to profile, update profile
      if (saveToProfile) {
        await this.saveValueToProfile(fieldId, newValue, userId);
      }

      // Update the form fill mapping
      // This would be implemented when we handle form fill storage
      
      return true;
    } catch (error) {
      console.error('Error updating field mapping:', error);
      return false;
    }
  }

  /**
   * Save field value to user profile
   */
  private static async saveValueToProfile(
    fieldKey: string,
    value: any,
    userId: string
  ): Promise<void> {
    try {
      const normalizedKey = this.normalizeFieldKey(fieldKey);
      
      // Map to profile fields
      const profileFieldMap: Record<string, string> = {
        'name': 'full_name',
        'full_name': 'full_name',
        'email': 'email',
        'phone': 'phone',
        'date_of_birth': 'date_of_birth',
        'dob': 'date_of_birth',
      };

      const profileField = profileFieldMap[normalizedKey];
      
      if (profileField) {
        // Update standard profile field
        await supabaseServer
          .from('profiles')
          .update({ [profileField]: value })
          .eq('user_id', userId);
      } else {
        // Save to custom fields
        const { data: profile } = await supabaseServer
          .from('profiles')
          .select('custom_fields')
          .eq('user_id', userId)
          .single();

        const customFields = profile?.custom_fields || {};
        customFields[normalizedKey] = value;

        await supabaseServer
          .from('profiles')
          .update({ custom_fields: customFields })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error saving to profile:', error);
      throw error;
    }
  }
}