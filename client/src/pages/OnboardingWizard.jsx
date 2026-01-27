import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Users, Building2, FolderKanban, Mail,
    ChevronRight, ChevronLeft, Check, Loader2, Sparkles, PartyPopper, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// Steps for CREATOR path (full wizard)
const CREATOR_STEPS = [
    { id: 'welcome', title: 'Welcome', icon: Sparkles },
    { id: 'organization', title: 'Workspace', icon: Building2 },
    { id: 'project', title: 'Project', icon: FolderKanban },
    { id: 'invite', title: 'Team', icon: Users }
];

// Steps for INVITEE path (simplified)
const INVITEE_STEPS = [
    { id: 'welcome', title: 'Welcome', icon: PartyPopper }
];

const ROLES = [
    { id: 'personal', label: 'Personal Use', description: 'Managing my own tasks and projects', icon: User },
    { id: 'team_lead', label: 'Team Lead', description: 'Leading a small team (2-10 people)', icon: Users },
    { id: 'manager', label: 'Manager', description: 'Managing multiple teams or projects', icon: Building2 }
];

export default function OnboardingWizard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Detect if user is an invitee
    const isInvitee = user?.isInvitee === true;
    const STEPS = isInvitee ? INVITEE_STEPS : CREATOR_STEPS;

    // Form state
    const [formData, setFormData] = useState({
        role: '',
        organizationName: '',
        projectName: '',
        inviteEmails: ['', '', '']
    });

    const updateFormData = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const updateInviteEmail = (index, value) => {
        const newEmails = [...formData.inviteEmails];
        newEmails[index] = value;
        setFormData(prev => ({ ...prev, inviteEmails: newEmails }));
    };

    const handleNext = () => {
        if (step < STEPS.length - 1) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            const payload = {
                role: formData.role || 'personal',
                // Invitees don't create org/project
                ...(isInvitee ? {} : {
                    organizationName: formData.organizationName || `${user?.name}'s Workspace`,
                    projectName: formData.projectName || 'My First Project',
                    inviteEmails: formData.inviteEmails.filter(e => e.trim())
                })
            };

            await api.post('/users/onboarding', payload);
            toast.success(isInvitee ? 'You\'re all set!' : 'Welcome to TaskKollecta!');

            // Force reload to update user state
            window.location.href = '/dashboard';
        } catch (error) {
            toast.error('Failed to complete onboarding');
            setLoading(false);
        }
    };

    const canProceed = () => {
        if (isInvitee) return true;
        switch (step) {
            case 0: return formData.role !== '';
            case 1: return true;
            case 2: return true;
            case 3: return true;
            default: return true;
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-center mb-2">
                        {STEPS.map((s, i) => (
                            <div key={s.id} className="flex items-center">
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all
                                    ${i < step ? 'bg-green-500 text-white' :
                                        i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/30' :
                                            'bg-muted text-muted-foreground'}
                                `}>
                                    {i < step ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`w-16 sm:w-24 h-1 mx-2 rounded ${i < step ? 'bg-green-500' : 'bg-muted'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-muted-foreground text-sm text-center mt-4">
                        {isInvitee ? 'Almost there!' : `Step ${step + 1} of ${STEPS.length}: ${STEPS[step].title}`}
                    </p>
                </div>

                {/* Card */}
                <Card className="border-border bg-card shadow-lg">
                    <CardContent className="p-8">

                        {/* INVITEE Welcome - Single Step */}
                        {isInvitee && step === 0 && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-2xl mb-4">
                                        <PartyPopper className="w-10 h-10 text-green-500" />
                                    </div>
                                    <h1 className="text-3xl font-bold text-foreground mb-2">
                                        Welcome aboard, {user?.name?.split(' ')[0]}! 🎉
                                    </h1>
                                    <p className="text-muted-foreground text-lg">
                                        You've joined the team! Your workspace is ready.
                                    </p>
                                </div>

                                <div className="bg-muted/50 rounded-xl p-6 text-center border border-border">
                                    <p className="text-muted-foreground mb-2">You've been added to:</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {user?.invitedToOrg?.name || 'Your Team\'s Workspace'}
                                    </p>
                                    <Badge variant="secondary" className="mt-3">
                                        <User className="w-3 h-3 mr-1" /> Member
                                    </Badge>
                                </div>

                                <p className="text-muted-foreground text-sm text-center">
                                    Click "Get Started" to explore your new workspace
                                </p>
                            </div>
                        )}

                        {/* CREATOR Step 0: Welcome & Role */}
                        {!isInvitee && step === 0 && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                                        <Sparkles className="w-8 h-8 text-primary" />
                                    </div>
                                    <h1 className="text-3xl font-bold text-foreground mb-2">
                                        Welcome to TaskKollecta, {user?.name?.split(' ')[0]}! 👋
                                    </h1>
                                    <p className="text-muted-foreground">
                                        Let's set up your workspace in just a few steps
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-foreground">How will you use TaskKollecta?</Label>
                                    {ROLES.map((role) => (
                                        <button
                                            key={role.id}
                                            onClick={() => updateFormData('role', role.id)}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${formData.role === role.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border bg-card hover:border-primary/50'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-lg ${formData.role === role.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                <role.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{role.label}</p>
                                                <p className="text-sm text-muted-foreground">{role.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CREATOR Step 1: Organization */}
                        {!isInvitee && step === 1 && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-2xl mb-4">
                                        <Building2 className="w-8 h-8 text-blue-500" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-foreground mb-2">Create Your Workspace</h1>
                                    <p className="text-muted-foreground">
                                        A workspace helps you organize your projects and team
                                    </p>
                                </div>

                                {/* RBAC Notice */}
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                                    <Shield className="w-5 h-5 text-primary mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">You'll be the Owner</p>
                                        <p className="text-xs text-muted-foreground">
                                            As the creator, you'll have full control including managing members, roles, and billing.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Workspace Name</Label>
                                        <Input
                                            placeholder={`${user?.name}'s Workspace`}
                                            value={formData.organizationName}
                                            onChange={(e) => updateFormData('organizationName', e.target.value)}
                                            className="h-12"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            You can change this later in settings
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CREATOR Step 2: Project */}
                        {!isInvitee && step === 2 && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/10 rounded-2xl mb-4">
                                        <FolderKanban className="w-8 h-8 text-orange-500" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-foreground mb-2">Create Your First Project</h1>
                                    <p className="text-muted-foreground">
                                        Projects contain tasks, milestones, and team discussions
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-foreground">Project Name</Label>
                                        <Input
                                            placeholder="My First Project"
                                            value={formData.projectName}
                                            onChange={(e) => updateFormData('projectName', e.target.value)}
                                            className="h-12"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CREATOR Step 3: Invite */}
                        {!isInvitee && step === 3 && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="text-center mb-8">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-2xl mb-4">
                                        <Users className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-foreground mb-2">Invite Your Team</h1>
                                    <p className="text-muted-foreground">
                                        Collaboration is better with friends! (Optional)
                                    </p>
                                </div>

                                {/* Role Info */}
                                <div className="bg-muted/50 border border-border rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">
                                        Invited members will join as <span className="font-medium text-foreground">Members</span>.
                                        You can promote them to Admin later in Team Settings.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {formData.inviteEmails.map((email, i) => (
                                        <div key={i} className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                type="email"
                                                placeholder={`teammate${i + 1}@example.com`}
                                                value={email}
                                                onChange={(e) => updateInviteEmail(i, e.target.value)}
                                                className="h-12 pl-10"
                                            />
                                        </div>
                                    ))}
                                    <p className="text-xs text-muted-foreground text-center">
                                        You can always invite more people later
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex justify-between mt-8 pt-6 border-t border-border">
                            {!isInvitee && (
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={step === 0}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                                </Button>
                            )}
                            {isInvitee && <div />}

                            {step < STEPS.length - 1 ? (
                                <Button
                                    onClick={handleNext}
                                    disabled={!canProceed()}
                                >
                                    Continue <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleComplete}
                                    disabled={loading}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                    Get Started
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Skip - only for creators */}
                {!isInvitee && (
                    <div className="text-center mt-6">
                        <button
                            onClick={handleComplete}
                            disabled={loading}
                            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >
                            Skip for now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
