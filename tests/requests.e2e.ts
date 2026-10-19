import { expect, expectNotSent, fragmentOf, test } from './fixtures';

test('someone can answer a request and only the requester can read it', async ({
	openPage,
	sent
}) => {
	const requester = await openPage('/request');
	await requester.getByLabel('What do you need?').fill('The staging database password');
	await requester.getByRole('button', { name: 'Create request' }).click();
	const shareLink = await requester.getByLabel('Link to send').inputValue();
	const inboxLink = await requester.getByLabel('Your private inbox link').inputValue();

	const inbox = await openPage(inboxLink);
	await expect(inbox.getByRole('heading', { name: 'Waiting for an answer' })).toBeVisible();

	const answer = 'staging: p0stgr3s-ember';
	const responder = await openPage(shareLink);
	await expect(responder.getByText('The staging database password')).toBeVisible();
	await responder.getByLabel('Your secret').fill(answer);
	await responder.getByRole('button', { name: 'Encrypt and send' }).click();
	await expect(responder.getByRole('heading', { name: 'Sent' })).toBeVisible();

	const second = await openPage(shareLink);
	await expect(
		second.getByRole('heading', { name: 'This request has already been answered' })
	).toBeVisible();

	await inbox.reload();
	await expect(inbox.getByRole('heading', { name: 'Your answer has arrived' })).toBeVisible();
	await inbox.getByRole('button', { name: 'Reveal answer' }).click();
	await expect(inbox.locator('#secret')).toHaveValue(answer);

	const again = await openPage(inboxLink);
	await expect(
		again.getByRole('heading', { name: 'This answer has already been read' })
	).toBeVisible();

	expectNotSent(
		sent,
		answer,
		'The staging database password',
		fragmentOf(shareLink),
		fragmentOf(inboxLink)
	);
});
